# Guru Traders ERP - Special Business Rules

## Document Number Generation

**Description:** PO, OC, and Export Document numbers are typically generated sequentially, likely handled in their respective Services or Model boot methods.

**Source Location:** `app/Services/OrderConfirmationService.php`, `app/Services/PurchaseOrderService.php`

## Status Transitions

**Description:** Inquiries move from Draft to Confirmed upon OC generation. Inward Entries move from Pending to Approved upon QC check.

**Source Location:** `InquiryController@convertFromInquiry`, `InwardEntryController@approve`

## Calculation: FOB & Markup

**Description:** Calculations involving Agent Commission, Supplier Discount, and Markups.

**Source Location:** `MarkupController` and `OrderConfirmationService`

## Packing Calculations

**Description:** Box calculations, net weights, and gross weights.

**Source Location:** `PackingController`, `ExportDocumentService`

## PDF Generation / Export

**Description:** DomPDF is used to generate multiple export documents. Found in `ExportDocumentController` (Delivery Challan, E-Invoice, Packing List, VGM, Bank Docs, Buyer Docs).

**Source Location:** `ExportDocumentController`, `InquiryController@pdf`

## Excel Exports

**Description:** Maatwebsite Excel is used for exporting inquiries and reports.

**Source Location:** `InquiryController@xlsx`, `ReportsController@export`

