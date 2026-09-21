# Guru Traders ERP - API / AJAX / JSON Inventory

| Method | URI | Controller | Purpose | Input | Output | Auth | Permission |
|---|---|---|---|---|---|---|---|
| UNKNOWN | UNKNOWN | InquiryController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| GET | sales/inquiries/products | InquiryController@products | AJAX Endpoint | JSON/Params | JSON | web, auth |  |
| GET | sales/inquiries/suppliers | InquiryController@suppliers | AJAX Endpoint | JSON/Params | JSON | web, auth |  |
| UNKNOWN | UNKNOWN | InwardEntryController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| UNKNOWN | UNKNOWN | JobberController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| GET | masters/jobbers/agents | JobberController@agents | AJAX Endpoint | JSON/Params | JSON | web, auth | jobber.view|supplier.view |
| UNKNOWN | UNKNOWN | MarkupController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| GET | masters/markups/supplier-agent-commission | MarkupController@supplierAgentCommission | AJAX Endpoint | JSON/Params | JSON | web, auth | markup.view |
| GET | masters/markups/buyer-agent-commission | MarkupController@buyerAgentCommission | AJAX Endpoint | JSON/Params | JSON | web, auth | markup.view |
| UNKNOWN | UNKNOWN | AgentController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| GET | masters/geo/states | GeoController@states | AJAX Endpoint | JSON/Params | JSON | web, auth |  |
| GET | masters/geo/cities | GeoController@cities | AJAX Endpoint | JSON/Params | JSON | web, auth |  |
| UNKNOWN | UNKNOWN | BuyerController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| POST | masters/buyers/designations | BuyerController@storeDesignation | AJAX Endpoint | JSON/Params | JSON | web, auth | buyer.create|buyer.edit |
| UNKNOWN | UNKNOWN | ProductController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| POST | masters/products/gst-rates | ProductController@storeGstRate | AJAX Endpoint | JSON/Params | JSON | web, auth | product.create|product.edit |
| UNKNOWN | UNKNOWN | SupplierController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| POST | masters/suppliers/supplier-types | SupplierController@storeSupplierType | AJAX Endpoint | JSON/Params | JSON | web, auth | supplier.create|supplier.edit|jobber.create|jobber.edit |
| GET | masters/suppliers/agents | SupplierController@agents | AJAX Endpoint | JSON/Params | JSON | web, auth | supplier.view |
| UNKNOWN | UNKNOWN | ExportDocumentOcrController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
| UNKNOWN | UNKNOWN | ExportDocumentChecklistController@__construct | AJAX Endpoint | JSON/Params | JSON | UNKNOWN | UNKNOWN |
