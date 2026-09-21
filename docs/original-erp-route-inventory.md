# Guru Traders ERP - Route Inventory

| Method | URI | Route Name | Controller | Method | Middleware | Permission | Purpose |
|---|---|---|---|---|---|---|---|
| GET | / |  | Closure |  | web |  |  |
| GET | dashboard | dashboard | DashboardController | index | web, auth, verified |  | List |
| GET | profile | profile.edit | ProfileController | edit | web, auth |  | Show edit form |
| PATCH | profile | profile.update | ProfileController | update | web, auth |  | Update record |
| DELETE | profile | profile.destroy | ProfileController | destroy | web, auth |  | Delete record |
| GET | masters/geo/states | masters.geo.states | GeoController | states | web, auth |  |  |
| GET | masters/geo/cities | masters.geo.cities | GeoController | cities | web, auth |  |  |
| PATCH | masters/categories/{category}/toggle-status | masters.categories.toggle-status | CategoryController | toggleStatus | web, auth | category.edit | Toggle active status |
| GET | masters/categories | masters.categories.index | CategoryController | index | web, auth | category.view | List |
| GET | masters/categories/create | masters.categories.create | CategoryController | create | web, auth | category.create | Show create form |
| POST | masters/categories | masters.categories.store | CategoryController | store | web, auth | category.create | Create record |
| GET | masters/categories/{category} | masters.categories.show | CategoryController | show | web, auth | category.view | View record |
| GET | masters/categories/{category}/edit | masters.categories.edit | CategoryController | edit | web, auth | category.edit | Show edit form |
| PUT|PATCH | masters/categories/{category} | masters.categories.update | CategoryController | update | web, auth | category.edit | Update record |
| DELETE | masters/categories/{category} | masters.categories.destroy | CategoryController | destroy | web, auth | category.delete | Delete record |
| GET | masters/products/check-code | masters.products.check-code | ProductController | checkCode | web, auth | product.view |  |
| PATCH | masters/products/{product}/toggle-status | masters.products.toggle-status | ProductController | toggleStatus | web, auth | product.edit | Toggle active status |
| POST | masters/products/gst-rates | masters.products.gst-rates.store | ProductController | storeGstRate | web, auth | product.create|product.edit |  |
| GET | masters/products | masters.products.index | ProductController | index | web, auth | product.view | List |
| GET | masters/products/create | masters.products.create | ProductController | create | web, auth | product.create | Show create form |
| POST | masters/products | masters.products.store | ProductController | store | web, auth | product.create | Create record |
| GET | masters/products/{product} | masters.products.show | ProductController | show | web, auth | product.view | View record |
| GET | masters/products/{product}/edit | masters.products.edit | ProductController | edit | web, auth | product.edit | Show edit form |
| PUT|PATCH | masters/products/{product} | masters.products.update | ProductController | update | web, auth | product.edit | Update record |
| DELETE | masters/products/{product} | masters.products.destroy | ProductController | destroy | web, auth | product.delete | Delete record |
| PATCH | masters/buyers/{buyer}/toggle-status | masters.buyers.toggle-status | BuyerController | toggleStatus | web, auth | buyer.edit | Toggle active status |
| POST | masters/buyers/payment-terms | masters.buyers.payment-terms.store | BuyerController | storePaymentTerm | web, auth | buyer.create|buyer.edit |  |
| POST | masters/buyers/designations | masters.buyers.designations.store | BuyerController | storeDesignation | web, auth | buyer.create|buyer.edit |  |
| GET | masters/buyers | masters.buyers.index | BuyerController | index | web, auth | buyer.view | List |
| GET | masters/buyers/create | masters.buyers.create | BuyerController | create | web, auth | buyer.create | Show create form |
| POST | masters/buyers | masters.buyers.store | BuyerController | store | web, auth | buyer.create | Create record |
| GET | masters/buyers/{buyer} | masters.buyers.show | BuyerController | show | web, auth | buyer.view | View record |
| GET | masters/buyers/{buyer}/edit | masters.buyers.edit | BuyerController | edit | web, auth | buyer.edit | Show edit form |
| PUT|PATCH | masters/buyers/{buyer} | masters.buyers.update | BuyerController | update | web, auth | buyer.edit | Update record |
| DELETE | masters/buyers/{buyer} | masters.buyers.destroy | BuyerController | destroy | web, auth | buyer.delete | Delete record |
| GET | masters/suppliers/check-code | masters.suppliers.check-code | SupplierController | checkCode | web, auth | supplier.view |  |
| GET | masters/suppliers/agents | masters.suppliers.agents | SupplierController | agents | web, auth | supplier.view |  |
| POST | masters/suppliers/supplier-types | masters.suppliers.supplier-types.store | SupplierController | storeSupplierType | web, auth | supplier.create|supplier.edit|jobber.create|jobber.edit |  |
| PATCH | masters/suppliers/{supplier}/toggle-status | masters.suppliers.toggle-status | SupplierController | toggleStatus | web, auth | supplier.edit | Toggle active status |
| GET | masters/suppliers | masters.suppliers.index | SupplierController | index | web, auth | supplier.view | List |
| GET | masters/suppliers/create | masters.suppliers.create | SupplierController | create | web, auth | supplier.create | Show create form |
| POST | masters/suppliers | masters.suppliers.store | SupplierController | store | web, auth | supplier.create | Create record |
| GET | masters/suppliers/{supplier} | masters.suppliers.show | SupplierController | show | web, auth | supplier.view | View record |
| GET | masters/suppliers/{supplier}/edit | masters.suppliers.edit | SupplierController | edit | web, auth | supplier.edit | Show edit form |
| PUT|PATCH | masters/suppliers/{supplier} | masters.suppliers.update | SupplierController | update | web, auth | supplier.edit | Update record |
| DELETE | masters/suppliers/{supplier} | masters.suppliers.destroy | SupplierController | destroy | web, auth | supplier.delete | Delete record |
| GET | masters/jobbers/check-code | masters.jobbers.check-code | JobberController | checkCode | web, auth | jobber.view|supplier.view |  |
| GET | masters/jobbers/agents | masters.jobbers.agents | JobberController | agents | web, auth | jobber.view|supplier.view |  |
| PATCH | masters/jobbers/{jobber}/toggle-status | masters.jobbers.toggle-status | JobberController | toggleStatus | web, auth | jobber.edit|supplier.edit | Toggle active status |
| GET | masters/jobbers | masters.jobbers.index | JobberController | index | web, auth | jobber.view|supplier.view | List |
| GET | masters/jobbers/create | masters.jobbers.create | JobberController | create | web, auth | jobber.create|supplier.create | Show create form |
| POST | masters/jobbers | masters.jobbers.store | JobberController | store | web, auth | jobber.create|supplier.create | Create record |
| GET | masters/jobbers/{jobber} | masters.jobbers.show | JobberController | show | web, auth | jobber.view|supplier.view | View record |
| GET | masters/jobbers/{jobber}/edit | masters.jobbers.edit | JobberController | edit | web, auth | jobber.edit|supplier.edit | Show edit form |
| PUT|PATCH | masters/jobbers/{jobber} | masters.jobbers.update | JobberController | update | web, auth | jobber.edit|supplier.edit | Update record |
| DELETE | masters/jobbers/{jobber} | masters.jobbers.destroy | JobberController | destroy | web, auth | jobber.delete|supplier.delete | Delete record |
| GET | masters/agents/check-code | masters.agents.check-code | AgentController | checkCode | web, auth |  |  |
| PATCH | masters/agents/{agent}/toggle-status | masters.agents.toggle-status | AgentController | toggleStatus | web, auth | agent.edit | Toggle active status |
| GET | masters/agents | masters.agents.index | AgentController | index | web, auth | agent.view | List |
| GET | masters/agents/create | masters.agents.create | AgentController | create | web, auth | agent.create | Show create form |
| POST | masters/agents | masters.agents.store | AgentController | store | web, auth | agent.create | Create record |
| GET | masters/agents/{agent} | masters.agents.show | AgentController | show | web, auth | agent.view | View record |
| GET | masters/agents/{agent}/edit | masters.agents.edit | AgentController | edit | web, auth | agent.edit | Show edit form |
| PUT|PATCH | masters/agents/{agent} | masters.agents.update | AgentController | update | web, auth | agent.edit | Update record |
| DELETE | masters/agents/{agent} | masters.agents.destroy | AgentController | destroy | web, auth | agent.delete | Delete record |
| PATCH | masters/fob-values/{fobValue}/toggle-status | masters.fob-values.toggle-status | FobValueController | toggleStatus | web, auth | fob-value.edit | Toggle active status |
| GET | masters/fob-values | masters.fob-values.index | FobValueController | index | web, auth | fob-value.view | List |
| GET | masters/fob-values/create | masters.fob-values.create | FobValueController | create | web, auth | fob-value.create | Show create form |
| POST | masters/fob-values | masters.fob-values.store | FobValueController | store | web, auth | fob-value.create | Create record |
| GET | masters/fob-values/{fob_value} | masters.fob-values.show | FobValueController | show | web, auth | fob-value.view | View record |
| GET | masters/fob-values/{fob_value}/edit | masters.fob-values.edit | FobValueController | edit | web, auth | fob-value.edit | Show edit form |
| PUT|PATCH | masters/fob-values/{fob_value} | masters.fob-values.update | FobValueController | update | web, auth | fob-value.edit | Update record |
| DELETE | masters/fob-values/{fob_value} | masters.fob-values.destroy | FobValueController | destroy | web, auth | fob-value.delete | Delete record |
| PATCH | masters/formats/{format}/toggle-status | masters.formats.toggle-status | DocumentFormatController | toggleStatus | web, auth | po-format.edit | Toggle active status |
| GET | masters/formats | masters.formats.index | DocumentFormatController | index | web, auth | po-format.view | List |
| GET | masters/formats/create | masters.formats.create | DocumentFormatController | create | web, auth | po-format.create | Show create form |
| POST | masters/formats | masters.formats.store | DocumentFormatController | store | web, auth | po-format.create | Create record |
| GET | masters/formats/{format} | masters.formats.show | DocumentFormatController | show | web, auth | po-format.view | View record |
| GET | masters/formats/{format}/edit | masters.formats.edit | DocumentFormatController | edit | web, auth | po-format.edit | Show edit form |
| PUT|PATCH | masters/formats/{format} | masters.formats.update | DocumentFormatController | update | web, auth | po-format.edit | Update record |
| DELETE | masters/formats/{format} | masters.formats.destroy | DocumentFormatController | destroy | web, auth | po-format.delete | Delete record |
| GET | masters/markups/supplier-discount | masters.markups.supplier-discount | MarkupController | supplierDiscount | web, auth | markup.view |  |
| GET | masters/markups/supplier-agent-commission | masters.markups.supplier-agent-commission | MarkupController | supplierAgentCommission | web, auth | markup.view |  |
| GET | masters/markups/buyer-agent-commission | masters.markups.buyer-agent-commission | MarkupController | buyerAgentCommission | web, auth | markup.view |  |
| PATCH | masters/markups/{markup}/toggle-status | masters.markups.toggle-status | MarkupController | toggleStatus | web, auth | markup.edit | Toggle active status |
| GET | masters/markups | masters.markups.index | MarkupController | index | web, auth | markup.view | List |
| GET | masters/markups/create | masters.markups.create | MarkupController | create | web, auth | markup.create | Show create form |
| POST | masters/markups | masters.markups.store | MarkupController | store | web, auth | markup.create | Create record |
| GET | masters/markups/{markup} | masters.markups.show | MarkupController | show | web, auth | markup.view | View record |
| GET | masters/markups/{markup}/edit | masters.markups.edit | MarkupController | edit | web, auth | markup.edit | Show edit form |
| PUT|PATCH | masters/markups/{markup} | masters.markups.update | MarkupController | update | web, auth | markup.edit | Update record |
| DELETE | masters/markups/{markup} | masters.markups.destroy | MarkupController | destroy | web, auth | markup.delete | Delete record |
| GET | sales/inquiries/products | sales.inquiries.products | InquiryController | products | web, auth |  |  |
| GET | sales/inquiries/suppliers | sales.inquiries.suppliers | InquiryController | suppliers | web, auth |  |  |
| POST | sales/inquiries/sources | sales.inquiries.sources.store | InquiryController | storeSource | web, auth | inquiry.create|inquiry.edit |  |
| POST | sales/inquiries/{inquiry}/convert-to-oc | sales.inquiries.convert-to-oc | OrderConfirmationController | convertFromInquiry | web, auth | order-confirmation.create |  |
| GET | sales/inquiries/{inquiry}/pdf | sales.inquiries.pdf | InquiryController | pdf | web, auth | inquiry.view |  |
| GET | sales/inquiries/{inquiry}/xlsx | sales.inquiries.xlsx | InquiryController | xlsx | web, auth | inquiry.view |  |
| GET | sales/inquiries | sales.inquiries.index | InquiryController | index | web, auth | inquiry.view | List |
| GET | sales/inquiries/create | sales.inquiries.create | InquiryController | create | web, auth | inquiry.create | Show create form |
| POST | sales/inquiries | sales.inquiries.store | InquiryController | store | web, auth | inquiry.create | Create record |
| GET | sales/inquiries/{inquiry} | sales.inquiries.show | InquiryController | show | web, auth | inquiry.view | View record |
| GET | sales/inquiries/{inquiry}/edit | sales.inquiries.edit | InquiryController | edit | web, auth | inquiry.edit | Show edit form |
| PUT|PATCH | sales/inquiries/{inquiry} | sales.inquiries.update | InquiryController | update | web, auth | inquiry.edit | Update record |
| DELETE | sales/inquiries/{inquiry} | sales.inquiries.destroy | InquiryController | destroy | web, auth | inquiry.delete | Delete record |
| POST | sales/order-confirmations/{orderConfirmation}/raise-purchase-orders | sales.order-confirmations.raise-purchase-orders | OrderConfirmationController | raisePurchaseOrders | web, auth | order-confirmation.approve |  |
| POST | sales/order-confirmations/{orderConfirmation}/raise-export-document | sales.order-confirmations.raise-export-document | ExportDocumentController | raiseFromOrderConfirmation | web, auth | export-document.create |  |
| GET | sales/order-confirmations | sales.order-confirmations.index | OrderConfirmationController | index | web, auth | order-confirmation.view | List |
| GET | sales/order-confirmations/create | sales.order-confirmations.create | OrderConfirmationController | create | web, auth | order-confirmation.create | Show create form |
| POST | sales/order-confirmations | sales.order-confirmations.store | OrderConfirmationController | store | web, auth | order-confirmation.create | Create record |
| GET | sales/order-confirmations/{orderConfirmation} | sales.order-confirmations.show | OrderConfirmationController | show | web, auth | order-confirmation.view | View record |
| GET | sales/order-confirmations/{orderConfirmation}/edit | sales.order-confirmations.edit | OrderConfirmationController | edit | web, auth | order-confirmation.edit | Show edit form |
| PUT|PATCH | sales/order-confirmations/{orderConfirmation} | sales.order-confirmations.update | OrderConfirmationController | update | web, auth | order-confirmation.edit | Update record |
| DELETE | sales/order-confirmations/{orderConfirmation} | sales.order-confirmations.destroy | OrderConfirmationController | destroy | web, auth | order-confirmation.delete | Delete record |
| GET | procurement/purchase-orders | procurement.purchase-orders.index | PurchaseOrderController | index | web, auth | purchase-order.view | List |
| GET | procurement/purchase-orders/create | procurement.purchase-orders.create | PurchaseOrderController | create | web, auth | purchase-order.create | Show create form |
| POST | procurement/purchase-orders | procurement.purchase-orders.store | PurchaseOrderController | store | web, auth | purchase-order.create | Create record |
| GET | procurement/purchase-orders/{purchaseOrder} | procurement.purchase-orders.show | PurchaseOrderController | show | web, auth | purchase-order.view | View record |
| GET | procurement/purchase-orders/{purchaseOrder}/edit | procurement.purchase-orders.edit | PurchaseOrderController | edit | web, auth | purchase-order.edit | Show edit form |
| PUT|PATCH | procurement/purchase-orders/{purchaseOrder} | procurement.purchase-orders.update | PurchaseOrderController | update | web, auth | purchase-order.edit | Update record |
| DELETE | procurement/purchase-orders/{purchaseOrder} | procurement.purchase-orders.destroy | PurchaseOrderController | destroy | web, auth | purchase-order.delete | Delete record |
| GET | procurement/inward-entries/po-details/{purchaseOrder} | procurement.inward-entries.po-details | InwardEntryController | poDetails | web, auth | inward-entry.view |  |
| POST | procurement/inward-entries/{inwardEntry}/approve | procurement.inward-entries.approve | InwardEntryController | approve | web, auth | inward-entry.approve |  |
| GET | procurement/inward-entries | procurement.inward-entries.index | InwardEntryController | index | web, auth | inward-entry.view | List |
| GET | procurement/inward-entries/create | procurement.inward-entries.create | InwardEntryController | create | web, auth | inward-entry.create | Show create form |
| POST | procurement/inward-entries | procurement.inward-entries.store | InwardEntryController | store | web, auth | inward-entry.create | Create record |
| GET | procurement/inward-entries/{inwardEntry} | procurement.inward-entries.show | InwardEntryController | show | web, auth | inward-entry.view | View record |
| GET | procurement/inward-entries/{inwardEntry}/edit | procurement.inward-entries.edit | InwardEntryController | edit | web, auth | inward-entry.edit | Show edit form |
| PUT|PATCH | procurement/inward-entries/{inwardEntry} | procurement.inward-entries.update | InwardEntryController | update | web, auth | inward-entry.edit | Update record |
| DELETE | procurement/inward-entries/{inwardEntry} | procurement.inward-entries.destroy | InwardEntryController | destroy | web, auth | inward-entry.delete | Delete record |
| GET | export/packing | export.packing.index | PackingController | index | web, auth | packing.view | List |
| GET | export/packing/{document} | export.packing.show | PackingController | show | web, auth | packing.view | View record |
| GET | export/ocr | export.ocr.index | ExportDocumentOcrController | index | web, auth | export-document.view | List |
| POST | export/ocr/extract | export.ocr.extract | ExportDocumentOcrController | extract | web, auth | export-document.edit |  |
| POST | export/ocr | export.ocr.store | ExportDocumentOcrController | store | web, auth | export-document.edit | Create record |
| POST | export/documents/{document}/checklist/{checklist} | export.documents.checklist.update | ExportDocumentChecklistController | update | web, auth | export-document.edit | Update record |
| POST | export/documents/{document}/checklist/{checklist}/ocr | export.documents.checklist.ocr | ExportDocumentChecklistController | extract | web, auth | export-document.edit |  |
| DELETE | export/documents/{document}/checklist/{checklist} | export.documents.checklist.reset | ExportDocumentChecklistController | reset | web, auth | export-document.edit |  |
| GET | export/documents/{document}/checklist/{checklist}/file | export.documents.checklist.file | ExportDocumentChecklistController | file | web, auth | export-document.view|purchase-bill.view|packing.view |  |
| GET | export/documents/{document}/delivery-challan | export.documents.delivery-challan | ExportDocumentController | deliveryChallanPdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/e-invoice | export.documents.e-invoice | ExportDocumentController | eInvoicePdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/packing-list/{variant} | export.documents.packing-list | ExportDocumentController | packingListPdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/bill-of-lading-draft | export.documents.bl-draft | ExportDocumentController | billOfLadingDraftPdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/export-invoice/{variant} | export.documents.export-invoice | ExportDocumentController | exportInvoicePdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/item-summary/{variant} | export.documents.item-summary | ExportDocumentController | itemSummaryPdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/purchase-bills/{variant} | export.documents.purchase-bills | ExportDocumentController | purchaseBillsPdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/vgm/{variant} | export.documents.vgm | ExportDocumentController | vgmPdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/bank-docs/{variant} | export.documents.bank-docs | ExportDocumentController | bankDocsPdf | web, auth | export-document.generate |  |
| GET | export/documents/{document}/buyer-docs/{variant} | export.documents.buyer-docs | ExportDocumentController | buyerDocsPdf | web, auth | export-document.generate |  |
| GET | export/documents | export.documents.index | ExportDocumentController | index | web, auth | export-document.view | List |
| GET | export/documents/{document} | export.documents.show | ExportDocumentController | show | web, auth | export-document.view | View record |
| GET | export/documents/{document}/edit | export.documents.edit | ExportDocumentController | edit | web, auth | export-document.edit | Show edit form |
| PUT|PATCH | export/documents/{document} | export.documents.update | ExportDocumentController | update | web, auth | export-document.edit | Update record |
| DELETE | export/documents/{document} | export.documents.destroy | ExportDocumentController | destroy | web, auth | export-document.delete | Delete record |
| GET | finance/purchase-bills | finance.purchase-bills.index | FinanceController | purchaseBills | web, auth | purchase-bill.view |  |
| GET | finance/debit-notes | finance.debit-notes.index | FinanceController | debitNotes | web, auth | debit-note.view |  |
| GET | finance/supplier-payments | finance.supplier-payments.index | FinanceController | supplierPayments | web, auth | payment.view |  |
| GET | finance/buyer-receipts | finance.buyer-receipts.index | FinanceController | buyerReceipts | web, auth | foreign-payment.view |  |
| GET | finance/agent-commission | finance.agent-commission.index | FinanceController | agentCommission | web, auth | agent-commission.view |  |
| GET | reports/outstanding | reports.outstanding.index | ReportsController | outstanding | web, auth | outstanding.view |  |
| GET | reports | reports.index | ReportsController | index | web, auth | report.view | List |
| PATCH | user-management/users/{user}/toggle-status | user-management.users.toggle-status | UserController | toggleStatus | web, auth |  | Toggle active status |
| GET | user-management/users | user-management.users.index | UserController | index | web, auth |  | List |
| GET | user-management/users/create | user-management.users.create | UserController | create | web, auth |  | Show create form |
| POST | user-management/users | user-management.users.store | UserController | store | web, auth |  | Create record |
| GET | user-management/users/{user} | user-management.users.show | UserController | show | web, auth |  | View record |
| GET | user-management/users/{user}/edit | user-management.users.edit | UserController | edit | web, auth |  | Show edit form |
| PUT|PATCH | user-management/users/{user} | user-management.users.update | UserController | update | web, auth |  | Update record |
| DELETE | user-management/users/{user} | user-management.users.destroy | UserController | destroy | web, auth |  | Delete record |
| GET | user-management/roles | user-management.roles.index | RoleController | index | web, auth | role.view | List |
| GET | user-management/roles/create | user-management.roles.create | RoleController | create | web, auth | role.create | Show create form |
| POST | user-management/roles | user-management.roles.store | RoleController | store | web, auth | role.create | Create record |
| GET | user-management/roles/{role} | user-management.roles.show | RoleController | show | web, auth | role.view | View record |
| GET | user-management/roles/{role}/edit | user-management.roles.edit | RoleController | edit | web, auth | role.edit | Show edit form |
| PUT|PATCH | user-management/roles/{role} | user-management.roles.update | RoleController | update | web, auth | role.edit | Update record |
| DELETE | user-management/roles/{role} | user-management.roles.destroy | RoleController | destroy | web, auth | role.delete | Delete record |
| GET | user-management/permissions | user-management.permissions.index | PermissionController | index | web, auth | permission.view | List |
| POST | user-management/permissions/sync | user-management.permissions.sync | PermissionController | sync | web, auth | permission.sync |  |
| GET | user-management/company-profile | user-management.company-profile.edit | CompanyProfileController | edit | web, auth | company-profile.view | Show edit form |
| PUT | user-management/company-profile | user-management.company-profile.update | CompanyProfileController | update | web, auth | company-profile.edit | Update record |
| GET | register | register | RegisteredUserController | create | web, guest |  | Show create form |
| POST | register |  | RegisteredUserController | store | web, guest |  | Create record |
| GET | login | login | AuthenticatedSessionController | create | web, guest |  | Show create form |
| POST | login |  | AuthenticatedSessionController | store | web, guest |  | Create record |
| GET | forgot-password | password.request | PasswordResetLinkController | create | web, guest |  | Show create form |
| POST | forgot-password | password.email | PasswordResetLinkController | store | web, guest |  | Create record |
| GET | reset-password/{token} | password.reset | NewPasswordController | create | web, guest |  | Show create form |
| POST | reset-password | password.store | NewPasswordController | store | web, guest |  | Create record |
| GET | verify-email | verification.notice | EmailVerificationPromptController | __invoke | web, auth |  |  |
| GET | verify-email/{id}/{hash} | verification.verify | VerifyEmailController | __invoke | web, auth, signed, throttle:6,1 |  |  |
| POST | email/verification-notification | verification.send | EmailVerificationNotificationController | store | web, auth, throttle:6,1 |  | Create record |
| GET | confirm-password | password.confirm | ConfirmablePasswordController | show | web, auth |  | View record |
| POST | confirm-password |  | ConfirmablePasswordController | store | web, auth |  | Create record |
| PUT | password | password.update | PasswordController | update | web, auth |  | Update record |
| POST | logout | logout | AuthenticatedSessionController | destroy | web, auth |  | Delete record |
| GET | storage/{path} | storage.local | Closure |  |  |  |  |
| PUT | storage/{path} | storage.local.upload | Closure |  |  |  |  |
