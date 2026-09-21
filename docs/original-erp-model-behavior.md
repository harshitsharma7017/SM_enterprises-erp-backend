# Guru Traders ERP - Models and Relationships Inventory

## ExportDocumentCartonLine

- **Table:** `export_document_carton_lines`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** description, unit, qty, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `carton()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## OrderConfirmation

- **Table:** `order_confirmations`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** mode, oc_date, buyer_ref, source_inquiry_id, buyer_id, category_id, document_format_id, agent_id, agent_commission_type, agent_commission_value, currency_id, incoterm, ship_method, shipment_date, pol, pod, payment_terms, delivery_details, packing_details, remarks, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `sourceInquiry()`: BelongsTo
- `buyer()`: BelongsTo
- `category()`: BelongsTo
- `format()`: BelongsTo
- `agent()`: BelongsTo
- `currency()`: BelongsTo
- `items()`: HasMany
- `purchaseOrders()`: HasMany
- `exportDocuments()`: HasMany
- `forceDestroy()`: belongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `statusLabel()`
- `statusColor()`
- `isDirect()`
- `totalAmount()`
- `searchable()`
- `sortable()`
- `forceDelete()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## CalculationBasis

- **Table:** `calculation_bases`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## InquiryItemColour

- **Table:** `inquiry_item_colours`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** colour, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `item()`: BelongsTo
- `sizes()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## Port

- **Table:** `ports`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** country_id, code, name, type, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `country()`: BelongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## Buyer

- **Table:** `buyers`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** company_name, name_on_export_invoice, contact_person, contact_designation_id, email, mobile, gst_vat_no, address, country_id, state_id, city_id, pincode, port_id, agent_id, agent_commission_type, agent_commission_value, payment_term_id, advance_percent, sight_percent, incoterm_id, shipment_method, currency_id, bank_name, account_number, swift_code, status, remarks, comments
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `categories()`: BelongsToMany
- `cartonMarkings()`: HasMany
- `country()`: BelongsTo
- `state()`: BelongsTo
- `city()`: BelongsTo
- `port()`: BelongsTo
- `contactDesignation()`: BelongsTo
- `contacts()`: HasMany
- `agent()`: BelongsTo
- `paymentTerm()`: BelongsTo
- `incoterm()`: BelongsTo
- `currency()`: BelongsTo
- `currencies()`: BelongsToMany
- `incoterms()`: BelongsToMany
- `forceDestroy()`: belongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo
- `restore()`: belongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`
- `forceDelete()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## Category

- **Table:** `categories`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** name, description, status, remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `formats()`: BelongsToMany
- `products()`: HasMany
- `buyers()`: BelongsToMany
- `suppliers()`: BelongsToMany
- `forceDelete()`: hasMany
- `scopeSearch()`: belongsTo
- `scopeStatus()`: belongsTo
- `scopeActive()`: belongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`
- `forceDestroy()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## AgentCommission

- **Table:** `agent_commissions`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** agent_id, commission_type, amount, currency_id, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `agent()`: BelongsTo
- `currency()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## ExportDocumentCarton

- **Table:** `export_document_cartons`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** carton_no, net_weight, gross_weight, dimensions, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `exportDocument()`: BelongsTo
- `lines()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- `totalQty()`

---

## Container

- **Table:** `containers`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** container_no, seal_no, type, remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `exportDocuments()`: BelongsToMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## ProductBomItem

- **Table:** `product_bom_items`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** product_id, sort_order, component_name, qty, unit, is_custom, remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `product()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## Agent

- **Table:** `agents`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** agent_type, name, display_code, phone, city, address, gst_number, pan_number, bank_name, account_number, ifsc_code, swift_code, calculation_basis_id, commission_paid_by, payment_term, payment_term_custom, status, remarks, comments
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `categories()`: BelongsToMany
- `commissionBasis()`: BelongsTo
- `commissions()`: HasMany
- `buyers()`: HasMany
- `suppliers()`: HasMany
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeOfType()`
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `collectsTaxDetails()`
- `bankCodeField()`
- `searchable()`
- `sortable()`
- `forceDelete()`
- `forceDestroy()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## Incoterm

- **Table:** `incoterms`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** code, name, description, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## DocumentFormatUnit

- **Table:** `document_format_units`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `format()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## Product

- **Table:** `products`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** category_id, item_group_code, name, name_on_export_document, barcode, unit_po, unit_export, hsn_code, drawback_sr_no, price_band_id, gst_rate_id, fabric_length_mtr, fabric_width_inch, description, status, remarks, comments
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `category()`: BelongsTo
- `priceBand()`: BelongsTo
- `gstRate()`: BelongsTo
- `incentives()`: HasMany
- `bomItems()`: HasMany
- `forceDelete()`: belongsTo
- `forceDestroy()`: hasMany
- `scopeActive()`: belongsTo
- `scopeSort()`: belongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo
- `forceDeleteQuietly()`: belongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`

### Accessors / Mutators
- None found

### Custom Methods
- `incentive()`
- `searchable()`
- `sortable()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## InquiryFollowUp

- **Table:** `inquiry_follow_ups`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** follow_up_date, comment, created_by
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `inquiry()`: BelongsTo
- `creator()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## DefaultMarkup

- **Table:** `default_markups`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, markup_percent, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeActive()`

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## Markup

- **Table:** `markups`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** supplier_id, buyer_id, markup_percent, status, remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `supplier()`: BelongsTo
- `buyer()`: BelongsTo
- `forceDelete()`: belongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `discountPercent()`
- `supplierAgent()`
- `supplierAgentCommissionLabel()`
- `buyerAgent()`
- `buyerAgentCommissionLabel()`
- `clientPrice()`
- `ourCost()`
- `profit()`
- `sortable()`
- `forceDestroy()`
- `searchable()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## Country

- **Table:** `countries`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** iso_code, name, dial_code, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `ports()`: HasMany
- `states()`: HasMany

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## PaymentTerm

- **Table:** `payment_terms`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, days, has_split, applies_to, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeForSide()`
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## City

- **Table:** `cities`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** state_id, name, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `state()`: BelongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## NumberSeries

- **Table:** `number_series`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** module, prefix, financial_year, current_number, padding, reset_yearly
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## SupplierContact

- **Table:** `supplier_contacts`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, designation_id, mobile, email, is_primary
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `supplier()`: BelongsTo
- `designation()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## OrderConfirmationItemColour

- **Table:** `order_confirmation_item_colours`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** colour, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `item()`: BelongsTo
- `sizes()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## BuyerCartonMarking

- **Table:** `buyer_carton_markings`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** buyer_id, line_no, label, value, is_required
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `buyer()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## ExportDocument

- **Table:** `export_documents`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** order_confirmation_id, buyer_id, currency_id, incoterm_id, port_of_loading_id, port_of_discharge_id, shipment_method_id, shipment_date, remarks, status, invoice_no, invoice_date, exporter_ref, buyer_ref_no, buyer_ref_date, other_reference, consignee_name, consignee_address, pre_carriage_by, place_of_receipt, vessel_flight_no, country_of_origin, forwarder_name, forwarder_address, vehicle_no, driver_cell, final_destination, marks_and_numbers, total_cartons, package_kind, freight_amount, insurance_amount, gross_weight, net_weight, carton_dimensions, booking_no, bl_no, voyage_no, transshipment_port, notify_party_name, notify_party_address, goods_description, total_measurement, ex_rate, freight_terms, freight_prepaid_at, freight_payable_at, total_prepaid_in, no_of_original_bls, bl_place_of_issue, bl_date_of_issue
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `orderConfirmation()`: BelongsTo
- `buyer()`: BelongsTo
- `currency()`: BelongsTo
- `incoterm()`: BelongsTo
- `portOfLoading()`: BelongsTo
- `portOfDischarge()`: BelongsTo
- `shipmentMethod()`: BelongsTo
- `items()`: HasMany
- `cartons()`: HasMany
- `checklist()`: HasMany
- `containers()`: BelongsToMany
- `shippedItems()`: HasMany
- `creator()`: BelongsTo
- `updater()`: BelongsTo
- `restore()`: hasMany

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `statusLabel()`
- `statusColor()`
- `totalAmount()`
- `notifyPartyName()`
- `notifyPartyAddress()`
- `countryOfFinalDestination()`
- `cartonQtyByUnit()`
- `checklistProgress()`
- `searchable()`
- `sortable()`
- `forceDelete()`
- `forceDestroy()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## GstRate

- **Table:** `gst_rates`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** rate, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## Designation

- **Table:** `designations`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `contacts()`: HasMany

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## User

- **Table:** `users`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, email, phone, status, created_by, password
- **Guarded:** *
- **Hidden:** password, remember_token
- **Appends:** None
- **Casts:** id

### Relationships
- `creator()`: BelongsTo
- `roles()`: BelongsToMany
- `teams()`: BelongsToMany
- `getPermissionClass()`: belongsTo
- `permissions()`: BelongsToMany

### Scopes
- `scopeActive()`
- `scopeSearch()`
- `scopeWithRole()`
- `scopeRole()`
- `scopeWithoutRole()`
- `scopeTeam()`
- `scopeWithoutTeam()`
- `scopePermission()`
- `scopeWithoutPermission()`

### Accessors / Mutators
- None found

### Custom Methods
- `isSuperAdmin()`
- `isProtected()`
- `factory()`
- `bootHasRoles()`
- `getRoleClass()`
- `assignRole()`
- `removeRole()`
- `syncRoles()`
- `hasRole()`
- `hasAnyRole()`
- `hasAllRoles()`
- `hasExactRoles()`
- `getDirectPermissions()`
- `getRoleNames()`
- `bootHasPermissions()`
- `getWildcardClass()`
- `filterPermission()`
- `hasPermissionTo()`
- `checkPermissionTo()`
- `hasAnyPermission()`
- `hasAllPermissions()`
- `hasDirectPermission()`
- `getPermissionsViaRoles()`
- `getAllPermissions()`
- `givePermissionTo()`
- `forgetWildcardPermissionIndex()`
- `syncPermissions()`
- `revokePermissionTo()`
- `getPermissionNames()`
- `forgetCachedPermissions()`
- `hasAllDirectPermissions()`
- `hasAnyDirectPermission()`
- `notifications()`
- `readNotifications()`
- `unreadNotifications()`
- `notify()`
- `notifyNow()`
- `routeNotificationFor()`

---

## Inquiry

- **Table:** `inquiries`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** inquiry_date, buyer_ref, source_id, buyer_id, category_id, document_format_id, agent_id, agent_commission_type, agent_commission_value, currency_id, exchange_rate, expected_shipment_date, delivery_details, packing_details, remarks, status, converted_at
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `buyer()`: BelongsTo
- `source()`: BelongsTo
- `category()`: BelongsTo
- `format()`: BelongsTo
- `agent()`: BelongsTo
- `currency()`: BelongsTo
- `items()`: HasMany
- `followUps()`: HasMany
- `forceDestroy()`: belongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `statusLabel()`
- `sourceLabel()`
- `statusColor()`
- `totalAmount()`
- `searchable()`
- `sortable()`
- `forceDelete()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## DocumentFormatColumn

- **Table:** `document_format_columns`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** key, label, is_enabled, is_mandatory, is_custom, print_only, sub_columns, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `format()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- `defaultLabel()`

---

## FobValue

- **Table:** `fob_values`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** name, status, remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`
- `forceDelete()`
- `forceDestroy()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## PurchaseOrder

- **Table:** `purchase_orders`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** order_confirmation_id, supplier_id, po_date, dispatch_date, delivery_details, packing_details, remarks, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `orderConfirmation()`: BelongsTo
- `supplier()`: BelongsTo
- `items()`: HasMany
- `timelineEntries()`: HasMany
- `raisedItems()`: HasMany
- `forceDestroy()`: hasMany
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `statusLabel()`
- `statusColor()`
- `totalAmount()`
- `agentCommissionAmount()`
- `agentCommissionAmountLabel()`
- `searchable()`
- `sortable()`
- `forceDelete()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## ExportDocumentItemColour

- **Table:** `export_document_item_colours`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** colour, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `item()`: BelongsTo
- `sizes()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## OrderConfirmationItem

- **Table:** `order_confirmation_items`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** sort_order, design_no, description, product_id, supplier_id, unit, fob_value_id, price, cost_price, qty, amount, remarks, custom_values
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `orderConfirmation()`: BelongsTo
- `product()`: BelongsTo
- `supplier()`: BelongsTo
- `fobValue()`: BelongsTo
- `purchaseOrder()`: BelongsTo
- `exportDocument()`: BelongsTo
- `colours()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- `isRaised()`
- `isShipped()`

---

## DocumentFormat

- **Table:** `document_formats`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** name, description, module, blade_view, status, allow_multiple_colours, delivery_details, packing_details
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `units()`: HasMany
- `columns()`: HasMany
- `images()`: HasMany
- `categories()`: BelongsToMany
- `forceDelete()`: hasMany
- `scopeSearch()`: hasMany
- `scopeStatus()`: hasMany
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `screenColumns()`
- `printColumns()`
- `priceLabel()`
- `searchable()`
- `sortable()`
- `forceDestroy()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## PurchaseOrderItem

- **Table:** `purchase_order_items`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** order_confirmation_item_id, sort_order, design_no, description, product_id, unit, cost_price, qty, amount, remarks, custom_values
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `purchaseOrder()`: BelongsTo
- `sourceItem()`: BelongsTo
- `product()`: BelongsTo
- `colours()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## State

- **Table:** `states`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** country_id, name, code, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `country()`: BelongsTo
- `cities()`: HasMany

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## InquiryItemBomLine

- **Table:** `inquiry_item_bom_lines`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** inquiry_item_id, sort_order, component_name, qty, unit, is_custom, remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `inquiryItem()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## InwardEntryItem

- **Table:** `inward_entry_items`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** inward_entry_id, purchase_order_item_id, product_id, sort_order, description, unit, ordered_qty, received_qty, passed_qty, rejected_qty, remarks, qc_remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `inwardEntry()`: BelongsTo
- `purchaseOrderItem()`: BelongsTo
- `product()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## SupplierType

- **Table:** `supplier_types`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** code, name, is_registered, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `suppliers()`: HasMany
- `sortable()`: hasMany

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`

---

## PurchaseOrderItemColour

- **Table:** `purchase_order_item_colours`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** colour, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `item()`: BelongsTo
- `sizes()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## ExportDocumentItemSize

- **Table:** `export_document_item_sizes`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** size, qty, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `colour()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## BuyerContact

- **Table:** `buyer_contacts`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, designation_id, mobile, email
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `buyer()`: BelongsTo
- `designation()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## InwardEntry

- **Table:** `inward_entries`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** financial_year, inward_date, purchase_order_id, supplier_id, challan_no, challan_date, remarks, status, qc_inspected_at, qc_inspected_by
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `purchaseOrder()`: BelongsTo
- `supplier()`: BelongsTo
- `items()`: HasMany
- `qcInspector()`: BelongsTo
- `forceDelete()`: belongsTo
- `scopeActive()`: belongsTo
- `scopeSort()`: hasMany
- `creator()`: BelongsTo
- `updater()`: BelongsTo
- `forceDeleteQuietly()`: belongsTo

### Scopes
- `scopeSearch()`
- `scopeStatus()`

### Accessors / Mutators
- None found

### Custom Methods
- `statusLabel()`
- `statusColor()`
- `totalReceivedQty()`
- `totalPassedQty()`
- `totalRejectedQty()`
- `searchable()`
- `sortable()`
- `forceDestroy()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `restore()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## Supplier

- **Table:** `suppliers`
- **Soft Deletes:** Yes
- **Boot/Booted Logic:** No
- **Fillable:** display_code, party_type, company_name, name_on_bill, supplier_type_id, gst_number, pan_number, is_msme, msme_registration_no, address, country_id, state_id, city_id, pincode, discount_percent, credit_days, bank_name, account_number, ifsc_code, agent_id, agent_commission_type, agent_commission_value, we_supply_material, requires_sample_approval, default_delivery_mode, client_details, status, remarks, comments
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `categories()`: BelongsToMany
- `products()`: BelongsToMany
- `buyers()`: BelongsToMany
- `contacts()`: HasMany
- `primaryContact()`: HasOne
- `supplierType()`: BelongsTo
- `country()`: BelongsTo
- `state()`: BelongsTo
- `city()`: BelongsTo
- `agent()`: BelongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo
- `restore()`: belongsTo

### Scopes
- `scopeOfParty()`
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`
- `forceDelete()`
- `forceDestroy()`
- `bootHasAuditColumns()`
- `bootSoftDeletes()`
- `initializeSoftDeletes()`
- `forceDeleteQuietly()`
- `restoreQuietly()`
- `trashed()`
- `softDeleted()`
- `restoring()`
- `restored()`
- `forceDeleting()`
- `forceDeleted()`
- `isForceDeleting()`
- `getDeletedAtColumn()`
- `getQualifiedDeletedAtColumn()`

---

## ShipmentMethod

- **Table:** `shipment_methods`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## OrderConfirmationItemSize

- **Table:** `order_confirmation_item_sizes`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** size, qty, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `colour()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## DocumentChecklistType

- **Table:** `document_checklist_types`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** code, name, description, category, variant_labels, closes_shipment, sort_order, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `checklistEntries()`: HasMany
- `scopeSearch()`: hasMany

### Scopes
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `hasVariants()`
- `requiresFile()`
- `searchable()`
- `sortable()`

---

## Currency

- **Table:** `currencies`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** iso_code, name, symbol, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## InquirySource

- **Table:** `inquiry_sources`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** name, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `inquiries()`: HasMany
- `searchable()`: hasMany

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `sortable()`

---

## PurchaseOrderTimelineEntry

- **Table:** `purchase_order_timeline_entries`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** entry_date, note, qty, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `purchaseOrder()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## InquiryItemSize

- **Table:** `inquiry_item_sizes`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** size, qty, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `colour()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## ExportDocumentChecklist

- **Table:** `export_document_checklists`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** export_document_id, document_checklist_type_id, variant_code, status, file_path, original_name, uploaded_at, generated_at, reference_no, amount, remarks
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `exportDocument()`: BelongsTo
- `type()`: BelongsTo
- `creator()`: BelongsTo
- `updater()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- `statusLabel()`
- `statusColor()`
- `variantLabel()`
- `hasFile()`
- `fileUrl()`
- `insuranceBlNumber()`
- `insuranceBlDate()`
- `bootHasAuditColumns()`

---

## ExportDocumentItem

- **Table:** `export_document_items`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** order_confirmation_item_id, sort_order, design_no, description, product_id, unit, price, qty, amount, remarks, custom_values
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `exportDocument()`: BelongsTo
- `sourceItem()`: BelongsTo
- `product()`: BelongsTo
- `colours()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## PriceBand

- **Table:** `price_bands`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** code, name, status
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- `scopeSearch()`
- `scopeStatus()`
- `scopeActive()`
- `scopeSort()`

### Accessors / Mutators
- None found

### Custom Methods
- `searchable()`
- `sortable()`

---

## CompanyProfile

- **Table:** `company_profile`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** company_name, tagline, address, phone, email, gstin, iec_code, bank_name, bank_account_number, bank_ifsc, bank_swift, signatory_name, signatory_designation, logo_path
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- None found

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- `current()`
- `hasLogo()`
- `logoUrl()`

---

## DocumentFormatImage

- **Table:** `document_format_images`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** path, original_name, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `format()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## ProductIncentive

- **Table:** `product_incentives`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** product_id, scheme, percent_1, percent_2, cap_value, calculation_basis_id
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `product()`: BelongsTo
- `calculationBasis()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- `schemeLabel()`

---

## PurchaseOrderItemSize

- **Table:** `purchase_order_item_sizes`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** size, qty, sort_order
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `colour()`: BelongsTo

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- None found

---

## InquiryItem

- **Table:** `inquiry_items`
- **Soft Deletes:** No
- **Boot/Booted Logic:** No
- **Fillable:** sort_order, design_no, description, product_id, supplier_id, unit, fob_value_id, price, cost_price, qty, amount, status, remarks, custom_values
- **Guarded:** *
- **Hidden:** None
- **Appends:** None
- **Casts:** id

### Relationships
- `inquiry()`: BelongsTo
- `product()`: BelongsTo
- `supplier()`: BelongsTo
- `fobValue()`: BelongsTo
- `colours()`: HasMany
- `bomLines()`: HasMany

### Scopes
- None found

### Accessors / Mutators
- None found

### Custom Methods
- `statusLabel()`
- `statusColor()`

---

