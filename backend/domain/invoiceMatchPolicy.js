'use strict';

function cents(value) { return Math.round(Number(value) * 100); }
function threeWayMatch(input) {
  const violations=[];
  const invoice=input.invoice||{}, po=input.purchaseOrder||{}, receipt=input.receipt||{};
  if(!input.documentChecksum||!/^[a-f0-9]{64}$/i.test(input.documentChecksum))violations.push('document_provenance_required');
  if(!input.vendorMasterRevision||!input.currencyRateRevision)violations.push('master_data_revision_required');
  if(!invoice.vendorId||invoice.vendorId!==po.vendorId)violations.push('vendor_mismatch');
  if(!invoice.number||!po.number)violations.push('invoice_and_po_numbers_required');
  if(!['USD','EUR','GBP','CAD'].includes(invoice.currency)||invoice.currency!==po.currency)violations.push('currency_mismatch_or_unsupported');
  for(const [name,value] of Object.entries({invoiceTotal:invoice.total,poTotal:po.total,receivedTotal:receipt.total}))if(!Number.isFinite(Number(value))||Number(value)<0)violations.push(`invalid_${name}`);
  const toleranceCents=Math.min(5000,Math.max(0,cents(input.toleranceAmount||0)));
  const invoiceCents=cents(invoice.total),poCents=cents(po.total),receiptCents=cents(receipt.total);
  if(Number.isFinite(invoiceCents)&&Number.isFinite(poCents)&&Math.abs(invoiceCents-poCents)>toleranceCents)violations.push('po_amount_mismatch');
  if(Number.isFinite(invoiceCents)&&Number.isFinite(receiptCents)&&Math.abs(invoiceCents-receiptCents)>toleranceCents)violations.push('receipt_amount_mismatch');
  if(receipt.accepted!==true)violations.push('receipt_not_accepted');
  if(input.duplicateFingerprintMatch===true)violations.push('possible_duplicate');
  if(input.vendorBankChangePending===true)violations.push('vendor_bank_change_hold');
  return {matched:violations.length===0,violations,decision:{invoiceCents,poCents,receiptCents,toleranceCents,currency:invoice.currency||null,requiresDualApproval:true,postingRequiresConfiguredErp:true}};
}
module.exports={threeWayMatch};
