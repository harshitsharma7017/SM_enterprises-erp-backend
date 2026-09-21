# Guru Traders ERP - Module Matrices

## Masters Module Matrix

| Module | List | Create | View | Edit | Delete | Other Actions | Controller | Permissions |
|---|---|---|---|---|---|---|---|---|
| Category | YES | YES | YES | YES | YES | toggleStatus | CategoryController | category.edit, category.view, category.create, category.delete |
| Order Format | YES | YES | YES | YES | YES | toggleStatus | DocumentFormatController | po-format.edit, po-format.view, po-format.create, po-format.delete |
| Product | YES | YES | YES | YES | YES | checkCode, toggleStatus, storeGstRate, products | InquiryController | product.view, product.edit, product.create|product.edit, product.create, product.delete |
| Buyer | YES | YES | YES | YES | YES | toggleStatus, storePaymentTerm, storeDesignation | BuyerController | buyer.edit, buyer.create|buyer.edit, buyer.view, buyer.create, buyer.delete |
| Supplier | YES | YES | YES | YES | YES | checkCode, agents, storeSupplierType, toggleStatus, suppliers | InquiryController | supplier.view, supplier.create|supplier.edit|jobber.create|jobber.edit, supplier.edit, supplier.create, supplier.delete |
| Jobber | YES | YES | YES | YES | YES | checkCode, agents, toggleStatus | JobberController | jobber.view|supplier.view, jobber.edit|supplier.edit, jobber.create|supplier.create, jobber.delete|supplier.delete |
| Agent | YES | YES | YES | YES | YES | agents, checkCode, toggleStatus | AgentController | supplier.view, jobber.view|supplier.view, agent.edit, agent.view, agent.create, agent.delete |
| FOB Value | YES | YES | YES | YES | YES | toggleStatus | FobValueController | fob-value.edit, fob-value.view, fob-value.create, fob-value.delete |
| Markup | YES | YES | YES | YES | YES | supplierDiscount, supplierAgentCommission, buyerAgentCommission, toggleStatus | MarkupController | markup.view, markup.edit, markup.create, markup.delete |

## Business Module Matrix

| Module | List | Create | View | Edit | Delete | Other Actions | Controller | Permissions |
|---|---|---|---|---|---|---|---|---|
| Inquiry | YES | YES | YES | YES | YES | products, suppliers, storeSource, convertFromInquiry, pdf, xlsx | InquiryController | inquiry.create|inquiry.edit, order-confirmation.create, inquiry.view, inquiry.create, inquiry.edit, inquiry.delete |
| Order Confirmation | YES | YES | YES | YES | YES | raisePurchaseOrders, raiseFromOrderConfirmation | OrderConfirmationController | order-confirmation.approve, export-document.create, order-confirmation.view, order-confirmation.create, order-confirmation.edit, order-confirmation.delete |
| Purchase Order | YES | YES | YES | YES | YES | raisePurchaseOrders | PurchaseOrderController | order-confirmation.approve, purchase-order.view, purchase-order.create, purchase-order.edit, purchase-order.delete |
| Goods Inward | YES | YES | YES | YES | YES | poDetails, approve | InwardEntryController | inward-entry.view, inward-entry.approve, inward-entry.create, inward-entry.edit, inward-entry.delete |
| Packing | YES | NO | YES | NO | NO | packingListPdf | ExportDocumentController | packing.view, export-document.generate |
| Export Document | YES | NO | YES | YES | YES | extract, reset, file, deliveryChallanPdf, eInvoicePdf, packingListPdf, billOfLadingDraftPdf, exportInvoicePdf, itemSummaryPdf, purchaseBillsPdf, vgmPdf, bankDocsPdf, buyerDocsPdf | ExportDocumentController | export-document.edit, export-document.view|purchase-bill.view|packing.view, export-document.generate, export-document.view, export-document.delete |
| Purchase Bill | NO | NO | NO | NO | NO | purchaseBillsPdf, purchaseBills | FinanceController | export-document.generate, purchase-bill.view |
| Debit Note | NO | NO | NO | NO | NO | debitNotes | FinanceController | debit-note.view |
| Supplier Payment | NO | NO | NO | NO | NO | supplierPayments | FinanceController | payment.view |
| Buyer Receipt | NO | NO | NO | NO | NO | buyerReceipts | FinanceController | foreign-payment.view |
| Agent Commission | NO | NO | NO | NO | NO | supplierAgentCommission, buyerAgentCommission, agentCommission | FinanceController | markup.view, agent-commission.view |
