# Guru Traders ERP - Business Workflow Map

## Inquiry

**Primary Controller:** `InquiryController`

### Workflow Summary
- **Entry Point:** `sales.inquiries.store` (POST `/sales/inquiries`)
- **Validation:** `StoreInquiryRequest`
- **Service:** `InquiryService::createInquiry()`
- **Database Writes:** `Inquiry`, `InquiryItem`
- **Status Transitions:** Draft -> Confirmed (via `inquiries.convert-to-oc` route calling `OrderConfirmationController@convertFromInquiry`)
- **Document Generation:** PDF generation via `inquiries.pdf`, Excel via `inquiries.xlsx`

## Quotation

**Status:** NOT IMPLEMENTED IN SOURCE

> Documented conceptually or expected in typical ERPs, but no dedicated controller or route exists in the original Laravel source for `Quotation`.

## Order Confirmation

**Primary Controller:** `OrderConfirmationController`

### Workflow Summary
- **Entry Point:** `sales.order-confirmations.store` OR converted from Inquiry.
- **Validation:** `StoreOrderConfirmationRequest`
- **Service:** `OrderConfirmationService::createOrderConfirmation()`
- **Database Writes:** `OrderConfirmation`, `OrderConfirmationItem`
- **Related records created:** Can raise `PurchaseOrder` via `raisePurchaseOrders()` or `ExportDocument` via `raiseFromOrderConfirmation()`.

## Purchase Order

**Primary Controller:** `PurchaseOrderController`

### Workflow Summary
- **Entry Point:** `procurement.purchase-orders.store` OR raised from OC.
- **Validation:** `StorePurchaseOrderRequest`
- **Service:** `PurchaseOrderService::createPurchaseOrder()`
- **Database Writes:** `PurchaseOrder`, `PurchaseOrderItem`
- **Transactions:** Handled by `DB::transaction` in Services.

## Goods Inward

**Primary Controller:** `InwardEntryController`

### Workflow Summary
- **Entry Point:** `procurement.inward-entries.store`
- **Validation:** `StoreInwardEntryRequest`
- **Service:** `InwardEntryService::createInwardEntry()`
- **Database Writes:** `InwardEntry`, `InwardEntryItem`
- **Status Transitions:** `approve()` method transitions status to Approved (QC Check).

## QC

**Primary Controller:** `InwardEntryController`

### Workflow Summary
- **Entry Point:** `procurement.inward-entries.store`
- **Validation:** `StoreInwardEntryRequest`
- **Service:** `InwardEntryService::createInwardEntry()`
- **Database Writes:** `InwardEntry`, `InwardEntryItem`
- **Status Transitions:** `approve()` method transitions status to Approved (QC Check).

## Packing

**Primary Controller:** `PackingController`

### Workflow Summary
- **Lifecycle:** Standard CRUD operations mapping directly to Model creation, with FormRequest validation wrapping the input.

## Shipment

**Status:** NOT IMPLEMENTED IN SOURCE

> Documented conceptually or expected in typical ERPs, but no dedicated controller or route exists in the original Laravel source for `Shipment`.

## Export Documents

**Primary Controller:** `ExportDocumentController`

### Workflow Summary
- **Entry Point:** `export.documents.store` OR raised from OC.
- **Validation:** `StoreExportDocumentRequest`
- **Service:** `ExportDocumentService`
- **Database Writes:** `ExportDocument`, `ExportDocumentChecklist`, `ExportDocumentCarton`, etc.
- **Document Generation:** Generates 10+ PDF formats (Delivery Challan, E-Invoice, Packing List, VGM, Bank Docs, etc.) using Dompdf.

## Payment / Finance

**Primary Controller:** `FinanceController`

### Workflow Summary
- **Lifecycle:** Standard CRUD operations mapping directly to Model creation, with FormRequest validation wrapping the input.

## Masters

**Primary Controller:** `CategoryController, ProductController, etc.`

### Workflow Summary
- **Lifecycle:** Standard CRUD operations mapping directly to Model creation, with FormRequest validation wrapping the input.

## User Management

**Primary Controller:** `UserController`

### Workflow Summary
- **Lifecycle:** Standard CRUD operations mapping directly to Model creation, with FormRequest validation wrapping the input.

## Roles / Permissions

**Primary Controller:** `RoleController, PermissionController`

### Workflow Summary
- **Lifecycle:** Standard CRUD operations mapping directly to Model creation, with FormRequest validation wrapping the input.

