'use strict';
const express=require('express');const db=require('../db');const {authenticateToken}=require('../middleware/auth');const {threeWayMatch}=require('../domain/invoiceMatchPolicy');
const router=express.Router();
const authorize=(...roles)=>(req,res,next)=>{req.tenantId=req.user?.tenantId||req.user?.tenant_id;if(!req.tenantId)return res.status(403).json({error:'Tenant claim required'});if(!roles.includes(req.user.role))return res.status(403).json({error:'Insufficient role'});next();};
router.use(authenticateToken);
router.get('/',authorize('ap_clerk','approver','controller','admin'),async(req,res)=>{const result=await db.query('SELECT * FROM invoice_posting_workflows WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',[req.tenantId]);res.json(result.rows);});
router.post('/',authorize('ap_clerk','admin'),async(req,res)=>{
 const key=req.get('Idempotency-Key');if(!key||key.length>128)return res.status(400).json({error:'Valid Idempotency-Key required'});
 const match=threeWayMatch(req.body||{});const status=match.matched?'matched':'exception';const client=await db.pool.connect();
 try{await client.query('BEGIN');const prior=await client.query('SELECT * FROM invoice_posting_workflows WHERE tenant_id=$1 AND idempotency_key=$2 FOR UPDATE',[req.tenantId,key]);if(prior.rows[0]){await client.query('COMMIT');return res.json(prior.rows[0]);}
 const result=await client.query(`INSERT INTO invoice_posting_workflows(tenant_id,idempotency_key,status,input,match_result,failure_code,created_by)VALUES($1,$2,$3,$4,$5,$6,$7)RETURNING *`,[req.tenantId,key,status,req.body,match,match.matched?null:'three_way_match_failed',String(req.user.id)]);
 await client.query('INSERT INTO invoice_posting_audit(workflow_id,tenant_id,actor_id,action,details)VALUES($1,$2,$3,$4,$5)',[result.rows[0].id,req.tenantId,String(req.user.id),status,{violations:match.violations}]);await client.query('COMMIT');res.status(201).json(result.rows[0]);
 }catch(_){await client.query('ROLLBACK');res.status(500).json({error:'Invoice workflow persistence failed',code:'workflow_persistence_failed'});}finally{client.release();}
});
router.post('/:id/submit',authorize('ap_clerk','admin'),async(req,res)=>{const result=await db.query(`UPDATE invoice_posting_workflows SET status='pending_first_approval',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='matched' RETURNING *`,[req.params.id,req.tenantId]);if(!result.rows[0])return res.status(409).json({error:'Only matched invoices can be submitted'});await db.query('INSERT INTO invoice_posting_audit(workflow_id,tenant_id,actor_id,action)VALUES($1,$2,$3,$4)',[req.params.id,req.tenantId,String(req.user.id),'submitted']);res.json(result.rows[0]);});
router.post('/:id/approve',authorize('approver','controller','admin'),async(req,res)=>{
 if(!String(req.body?.reason||'').trim())return res.status(400).json({error:'reason required'});
 const client=await db.pool.connect();try{await client.query('BEGIN');const current=await client.query('SELECT * FROM invoice_posting_workflows WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.tenantId]);const row=current.rows[0];if(!row){await client.query('ROLLBACK');return res.status(404).json({error:'Workflow not found'});}const actor=String(req.user.id);let next,sqlParams;
 if(row.status==='pending_first_approval'&&row.created_by!==actor){next='pending_second_approval';sqlParams=[next,actor,req.body.reason.trim(),req.params.id,req.tenantId];}
 else if(row.status==='pending_second_approval'&&row.first_approver!==actor&&row.created_by!==actor){next='approved_for_posting';sqlParams=[next,actor,req.body.reason.trim(),req.params.id,req.tenantId];}
 else{await client.query('ROLLBACK');return res.status(409).json({error:'Independent sequential approval required'});}
 const column=next==='pending_second_approval'?'first_approver':'second_approver';const reasonColumn=next==='pending_second_approval'?'first_approval_reason':'second_approval_reason';
 const updated=await client.query(`UPDATE invoice_posting_workflows SET status=$1,${column}=$2,${reasonColumn}=$3,updated_at=NOW() WHERE id=$4 AND tenant_id=$5 RETURNING *`,sqlParams);
 await client.query('INSERT INTO invoice_posting_audit(workflow_id,tenant_id,actor_id,action,details)VALUES($1,$2,$3,$4,$5)',[row.id,req.tenantId,actor,next,{reason:req.body.reason}]);await client.query('COMMIT');res.json(updated.rows[0]);
 }catch(_){await client.query('ROLLBACK');res.status(500).json({error:'Approval persistence failed',code:'approval_persistence_failed'});}finally{client.release();}
});
module.exports=router;
