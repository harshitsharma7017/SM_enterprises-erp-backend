# Guru Traders ERP - Form Request Validation Inventory

## StoreRoleRequest

**Authorization (`authorize()`):** `$this->user()->can('role.create')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `name`: `'required', 'string', 'max:100', 'unique:roles,name'`
- `permissions`: `'nullable', 'array'`
- `permissions.*`: `'string', 'exists:permissions,name'`

---

## UpdateUserRequest

**Authorization (`authorize()`):** `$this->user()->can('user.edit')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique

**Rules Outline:**
- `name`: `'required', 'string', 'max:255'`
- `email`: `'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)`
- `phone`: `'nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()`
- `password`: `'nullable', 'confirmed', Password::min(8)->letters()->numbers()`
- `roles`: `'required', 'array', 'min:1'`
- `roles.*`: `'string', 'exists:roles,name'`
- `status`: `'nullable', 'boolean'`

---

## UpdateRoleRequest

**Authorization (`authorize()`):** `$this->user()->can('role.edit')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique

**Rules Outline:**
- `name`: `'required', 'string', 'max:100', Rule::unique('roles', 'name')->ignore($this->route('role')->id)`
- `permissions`: `'nullable', 'array'`
- `permissions.*`: `'string', 'exists:permissions,name'`

---

## StoreUserRequest

**Authorization (`authorize()`):** `$this->user()->can('user.create')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `name`: `'required', 'string', 'max:255'`
- `email`: `'required', 'string', 'email', 'max:255', 'unique:users,email'`
- `phone`: `'nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()`
- `password`: `'required', 'confirmed', Password::min(8)->letters()->numbers()`
- `roles`: `'required', 'array', 'min:1'`
- `roles.*`: `'string', 'exists:roles,name'`
- `status`: `'nullable', 'boolean'`

---

## StoreOrderConfirmationRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## InquiryRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::exists

**Rules Outline:**
- `mode`: `'required', Rule::in(['draft', 'submit'`
- `inquiry_date`: `'required', 'date'`
- `buyer_ref`: `'nullable', 'string', 'max:100'`
- `source_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('inquiry_sources', 'id')`
- `buyer_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('buyers', 'id')`
- `category_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('categories', 'id')`
- `document_format_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('document_formats', 'id')`
- `agent_id`: `'nullable', 'integer', Rule::exists('agents', 'id')`
- `agent_commission_type`: `'nullable', 'required_with:agent_commission_value', Rule::in(['percent', 'flat'`
- `agent_commission_value`: `'nullable', 'numeric', 'min:0', 'max:99999999.9999'`
- `currency_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('currencies', 'id')`
- `exchange_rate`: `'nullable', 'numeric', 'min:0', 'max:99999999.9999'`
- `expected_shipment_date`: `'nullable', 'date'`
- `delivery_details`: `$requiredUnlessDraft, 'nullable', 'string'`
- `packing_details`: `$requiredUnlessDraft, 'nullable', 'string'`
- `remarks`: `'nullable', 'string', 'max:2000'`
- `status`: `'required', Rule::in(array_keys(Inquiry::STATUSES))`
- `items`: `'nullable', 'array', 'max:200'`
- `items.*.design_no`: `'nullable', 'string', 'max:150'`
- `items.*.description`: `'nullable', 'string', 'max:2000'`
- `items.*.product_id`: `'nullable', 'integer', Rule::exists('products', 'id')`
- `items.*.supplier_id`: `'nullable', 'integer', Rule::exists('suppliers', 'id')`
- `items.*.unit`: `'nullable', 'string', 'max:20'`
- `items.*.fob_value_id`: `'nullable', 'integer', Rule::exists('fob_values', 'id')`
- `items.*.price`: `'nullable', 'numeric', 'min:0', 'max:9999999999.99'`
- `items.*.cost_price`: `'nullable', 'numeric', 'min:0', 'max:9999999999.99'`
- `items.*.status`: `'nullable', Rule::in(array_keys(Inquiry::STATUSES))`
- `items.*.remarks`: `'nullable', 'string', 'max:1000'`
- `items.*.colours`: `'nullable', 'array', 'max:50'`
- `items.*.colours.*.colour`: `'nullable', 'string', 'max:60'`
- `items.*.colours.*.sizes`: `'nullable', 'array', 'max:50'`
- `items.*.colours.*.sizes.*.size`: `'nullable', 'string', 'max:20'`
- `items.*.colours.*.sizes.*.qty`: `'nullable', 'integer', 'min:0', 'max:999999'`
- `items.*.custom`: `'nullable', 'array', 'max:20'`
- `items.*.custom.*`: `'nullable', 'string', 'max:255'`
- `items.*.bom`: `'nullable', 'array', 'max:100'`
- `items.*.bom.*.component_name`: `'nullable', 'string', 'max:200'`
- `items.*.bom.*.qty`: `'nullable', 'numeric', 'min:0', 'max:99999999.9999'`
- `items.*.bom.*.unit`: `'nullable', 'string', 'max:20'`
- `items.*.bom.*.is_custom`: `'nullable', 'boolean'`
- `items.*.bom.*.remarks`: `'nullable', 'string', 'max:500'`
- `followups`: `'nullable', 'array', 'max:100'`
- `followups.*.id`: `'nullable', 'integer'`
- `followups.*.date`: `'nullable', 'date', 'required_with:followups.*.comment'`
- `followups.*.comment`: `'nullable', 'string', 'max:2000'`

---

## UpdateInquiryRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## UpdateOrderConfirmationRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## StoreInquiryRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## OrderConfirmationRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::exists

**Rules Outline:**
- `mode`: `'required', Rule::in(array_keys(OrderConfirmation::MODES))`
- `oc_date`: `'required', 'date'`
- `buyer_ref`: `'nullable', 'string', 'max:100'`
- `buyer_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('buyers', 'id')`
- `category_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('categories', 'id')`
- `document_format_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('document_formats', 'id')`
- `agent_id`: `'nullable', 'integer', Rule::exists('agents', 'id')`
- `agent_commission_type`: `'nullable', 'required_with:agent_commission_value', Rule::in(['percent', 'flat'`
- `agent_commission_value`: `'nullable', 'numeric', 'min:0', 'max:99999999.9999'`
- `currency_id`: `$requiredUnlessDraft, 'nullable', 'integer', Rule::exists('currencies', 'id')`
- `incoterm`: `'nullable', 'string', 'max:20'`
- `ship_method`: `'nullable', 'string', 'max:60'`
- `shipment_date`: `'nullable', 'string', 'max:60'`
- `pol`: `'nullable', 'string', 'max:120'`
- `pod`: `'nullable', 'string', 'max:120'`
- `payment_terms`: `'nullable', 'string', 'max:120'`
- `delivery_details`: `$requiredUnlessDraft, 'nullable', 'string'`
- `packing_details`: `$requiredUnlessDraft, 'nullable', 'string'`
- `remarks`: `'nullable', 'string', 'max:2000'`
- `status`: `'required', Rule::in(array_keys(OrderConfirmation::STATUSES))`
- `items`: `'nullable', 'array', 'max:200'`
- `items.*.design_no`: `'nullable', 'string', 'max:150'`
- `items.*.description`: `'nullable', 'string', 'max:2000'`
- `items.*.product_id`: `'nullable', 'integer', Rule::exists('products', 'id')`
- `items.*.supplier_id`: `'nullable', 'integer', Rule::exists('suppliers', 'id')`
- `items.*.unit`: `'nullable', 'string', 'max:20'`
- `items.*.fob_value_id`: `'nullable', 'integer', Rule::exists('fob_values', 'id')`
- `items.*.price`: `'nullable', 'numeric', 'min:0', 'max:9999999999.99'`
- `items.*.cost_price`: `'nullable', 'numeric', 'min:0', 'max:9999999999.99'`
- `items.*.remarks`: `'nullable', 'string', 'max:1000'`
- `items.*.colours`: `'nullable', 'array', 'max:50'`
- `items.*.colours.*.colour`: `'nullable', 'string', 'max:60'`
- `items.*.colours.*.sizes`: `'nullable', 'array', 'max:50'`
- `items.*.colours.*.sizes.*.size`: `'nullable', 'string', 'max:20'`
- `items.*.colours.*.sizes.*.qty`: `'nullable', 'integer', 'min:0', 'max:999999'`
- `items.*.custom`: `'nullable', 'array', 'max:20'`
- `items.*.custom.*`: `'nullable', 'string', 'max:255'`

---

## LoginRequest

**Authorization (`authorize()`):** `true`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `email`: `'required', 'string', 'email'`
- `password`: `'required', 'string'`

---

## ProfileUpdateRequest

**Authorization (`authorize()`):** `Not overridden`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique

**Rules Outline:**
- `name`: `'required', 'string', 'max:255'`
- `email`: `'required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->ignore($this->user()->id),`

---

## StorePurchaseOrderRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## PurchaseOrderRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::exists

**Rules Outline:**
- `order_confirmation_id`: `'required', 'integer', Rule::exists('order_confirmations', 'id')`
- `supplier_id`: `'required', 'integer', Rule::exists('suppliers', 'id')`
- `po_date`: `'required', 'date'`
- `dispatch_date`: `'nullable', 'date'`
- `remarks`: `'nullable', 'string', 'max:2000'`
- `delivery_details`: `$requiredUnlessDraft, 'nullable', 'string'`
- `packing_details`: `$requiredUnlessDraft, 'nullable', 'string'`
- `status`: `'required', Rule::in(['draft', 'raised'`
- `items`: `'nullable', 'array', 'max:200'`
- `items.*.order_confirmation_item_id`: `'nullable', 'integer', Rule::exists('order_confirmation_items', 'id')`
- `items.*.design_no`: `'nullable', 'string', 'max:150'`
- `items.*.description`: `'nullable', 'string', 'max:2000'`
- `items.*.product_id`: `'nullable', 'integer', Rule::exists('products', 'id')`
- `items.*.unit`: `'nullable', 'string', 'max:20'`
- `items.*.cost_price`: `'nullable', 'numeric', 'min:0', 'max:9999999999.99'`
- `items.*.remarks`: `'nullable', 'string', 'max:1000'`
- `items.*.colours`: `'nullable', 'array', 'max:50'`
- `items.*.colours.*.colour`: `'nullable', 'string', 'max:60'`
- `items.*.colours.*.sizes`: `'nullable', 'array', 'max:50'`
- `items.*.colours.*.sizes.*.size`: `'nullable', 'string', 'max:20'`
- `items.*.colours.*.sizes.*.qty`: `'nullable', 'integer', 'min:0', 'max:999999'`
- `items.*.custom`: `'nullable', 'array', 'max:20'`
- `items.*.custom.*`: `'nullable', 'string', 'max:255'`
- `timeline`: `'nullable', 'array', 'max:100'`
- `timeline.*.date`: `'nullable', 'date', 'required_with:timeline.*.note'`
- `timeline.*.note`: `'nullable', 'string', 'max:255'`
- `timeline.*.qty`: `'nullable', 'integer', 'min:0', 'max:999999'`

---

## UpdateInwardEntryRequest

**Authorization (`authorize()`):** `$this->user()->can('inward-entry.edit')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `inward_date`: `'required', 'date'`
- `challan_no`: `'nullable', 'string', 'max:100'`
- `challan_date`: `'nullable', 'date'`
- `remarks`: `'nullable', 'string', 'max:1000'`
- `items`: `'required', 'array', 'min:1'`
- `items.*.purchase_order_item_id`: `'required', 'integer', 'exists:purchase_order_items,id'`
- `items.*.received_qty`: `'required', 'integer', 'min:0'`
- `items.*.passed_qty`: `'nullable', 'integer', 'min:0'`
- `items.*.rejected_qty`: `'nullable', 'integer', 'min:0'`
- `items.*.remarks`: `'nullable', 'string', 'max:500'`
- `items.*.qc_remarks`: `'nullable', 'string', 'max:500'`

---

## ApproveInwardEntryRequest

**Authorization (`authorize()`):** `$this->user()->can('inward-entry.approve')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `status`: `'required', 'in:approved,rejected'`
- `remarks`: `'nullable', 'string', 'max:1000'`
- `items`: `'nullable', 'array'`
- `items.*.passed_qty`: `'nullable', 'integer', 'min:0'`
- `items.*.rejected_qty`: `'nullable', 'integer', 'min:0'`
- `items.*.qc_remarks`: `'nullable', 'string', 'max:500'`

---

## UpdatePurchaseOrderRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## StoreInwardEntryRequest

**Authorization (`authorize()`):** `$this->user()->can('inward-entry.create')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `purchase_order_id`: `'required', 'integer', 'exists:purchase_orders,id'`
- `inward_date`: `'required', 'date'`
- `challan_no`: `'nullable', 'string', 'max:100'`
- `challan_date`: `'nullable', 'date'`
- `remarks`: `'nullable', 'string', 'max:1000'`
- `items`: `'required', 'array', 'min:1'`
- `items.*.purchase_order_item_id`: `'required', 'integer', 'exists:purchase_order_items,id'`
- `items.*.received_qty`: `'required', 'integer', 'min:0'`
- `items.*.remarks`: `'nullable', 'string', 'max:500'`

---

## UpdateCompanyProfileRequest

**Authorization (`authorize()`):** `$this->user()->can('company-profile.edit')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `company_name`: `'required', 'string', 'max:255'`
- `tagline`: `'nullable', 'string', 'max:255'`
- `address`: `'nullable', 'string', 'max:1000'`
- `phone`: `'nullable', 'string', 'max:100'`
- `email`: `'nullable', 'email', 'max:255'`
- `gstin`: `'nullable', 'string', 'max:20'`
- `iec_code`: `'nullable', 'string', 'max:20'`
- `bank_name`: `'nullable', 'string', 'max:150'`
- `bank_account_number`: `'nullable', 'string', 'max:40'`
- `bank_ifsc`: `'nullable', 'string', 'max:20'`
- `bank_swift`: `'nullable', 'string', 'max:20'`
- `signatory_name`: `'nullable', 'string', 'max:150'`
- `signatory_designation`: `'nullable', 'string', 'max:150'`
- `logo`: `'nullable', 'image', 'max:2048'`

---

## StoreMarkupRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## UpdateDocumentFormatRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## StoreAgentRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## DocumentFormatRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique

**Rules Outline:**
- `name`: `'required', 'string', 'max:120', Rule::unique('document_formats', 'name')->ignore($this->ignoreId()),`
- `description`: `'nullable', 'string', 'max:1000'`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `allow_multiple_colours`: `'required', 'boolean'`
- `units`: `'required', 'array', 'min:1', 'max:20'`
- `units.*`: `'string', 'max:20', 'regex:/^[A-Z0-9 .\/-`
- `columns`: `'required', 'array'`
- `columns.*.label`: `'required', 'string', 'max:60'`
- `columns.*.enabled`: `'nullable', 'boolean'`
- `columns.*.mandatory`: `'nullable', 'boolean'`
- `columns.*.is_custom`: `'nullable', 'boolean'`
- `columns.*.print_only`: `'nullable', 'boolean'`
- `columns.*.sub_columns`: `'nullable', 'string', 'max:500'`
- `column_order`: `'required', 'array', 'min:1'`
- `column_order.*`: `'required', 'string', 'max:60'`
- `delivery_details`: `'nullable', 'string', 'max:2000'`
- `packing_details`: `'nullable', 'string', 'max:2000'`
- `images`: `'nullable', 'array', 'max:10'`
- `images.*`: `'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'`
- `keep_images`: `'nullable', 'array'`
- `keep_images.*`: `'integer'`

---

## UpdateBuyerRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## StoreSupplierRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## UpdateCategoryRequest

**Authorization (`authorize()`):** `$this->user()->can('category.edit')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique
- Rule::exists

**Rules Outline:**
- `name`: `'required', 'string', 'max:120', Rule::unique('categories', 'name')->ignore($this->route('category')->id)`
- `format_ids`: `'nullable', 'array'`
- `format_ids.*`: `'integer', Rule::exists('document_formats', 'id')`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`

---

## ProductRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique
- Rule::exists

**Rules Outline:**
- `category_id`: `'required', 'integer', Rule::exists('categories', 'id')`
- `item_group_code`: `'required', 'string', 'max:5', 'regex:/^[A-Z0-9`
- `name`: `'required', 'string', 'max:200', Rule::unique('products', 'name')->ignore($ignore)`
- `name_on_export_document`: `'nullable', 'string', 'max:255'`
- `barcode`: `'nullable', 'string', 'max:60'`
- `unit_po`: `'nullable', 'string', 'max:20'`
- `unit_export`: `'nullable', 'string', 'max:20'`
- `hsn_code`: `'nullable', 'string', 'regex:/^[0-9`
- `drawback_sr_no`: `'nullable', 'string', 'max:20'`
- `price_band_id`: `'nullable', 'integer', Rule::exists('price_bands', 'id')`
- `gst_rate_id`: `'nullable', 'integer', Rule::exists('gst_rates', 'id')`
- `fabric_length_mtr`: `'nullable', 'numeric', 'min:0', 'max:99999.999'`
- `fabric_width_inch`: `'nullable', 'numeric', 'min:0', 'max:99999.999'`
- `description`: `'nullable', 'string', 'max:1000'`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`
- `comments`: `'nullable', 'string', 'max:1000'`
- `incentives`: `'nullable', 'array'`
- `bom`: `'nullable', 'array', 'max:100'`
- `bom.*.component_name`: `'nullable', 'string', 'max:200'`
- `bom.*.qty`: `'nullable', 'numeric', 'min:0', 'max:99999999.9999'`
- `bom.*.unit`: `'nullable', 'string', 'max:20'`
- `bom.*.is_custom`: `'nullable', 'boolean'`
- `bom.*.remarks`: `'nullable', 'string', 'max:500'`

---

## StoreCategoryRequest

**Authorization (`authorize()`):** `$this->user()->can('category.create')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique
- Rule::exists

**Rules Outline:**
- `name`: `'required', 'string', 'max:120', Rule::unique('categories', 'name')`
- `format_ids`: `'nullable', 'array'`
- `format_ids.*`: `'integer', Rule::exists('document_formats', 'id')`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`

---

## BuyerRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::exists

**Rules Outline:**
- `company_name`: `'required', 'string', 'max:200'`
- `name_on_export_invoice`: `'nullable', 'string', 'max:200'`
- `category_ids`: `'nullable', 'array'`
- `category_ids.*`: `'integer', Rule::exists('categories', 'id')`
- `contact_person`: `'nullable', 'string', 'max:120'`
- `contact_designation_id`: `'nullable', 'integer', Rule::exists('designations', 'id')`
- `email`: `'nullable', 'email', 'max:150'`
- `mobile`: `'nullable', 'string', 'max:30'`
- `gst_vat_no`: `'nullable', 'string', 'size:15', 'regex:/^[0-9`
- `contacts`: `'nullable', 'array'`
- `contacts.*.name`: `'required_with:contacts.*.mobile,contacts.*.email,contacts.*.designation_id', 'nullable', 'string', 'max:120'`
- `contacts.*.designation_id`: `'nullable', 'integer', Rule::exists('designations', 'id')->where('status', 'active')`
- `contacts.*.mobile`: `'nullable', 'string', 'max:30'`
- `contacts.*.email`: `'nullable', 'email', 'max:150'`
- `address`: `'nullable', 'string', 'max:255'`
- `country_id`: `'nullable', 'integer', Rule::exists('countries', 'id')`
- `state_id`: `'nullable', 'integer', Rule::exists('states', 'id')->where( fn ($q) => $q->where('country_id', $this->input('country_id')) ),`
- `city_id`: `'nullable', 'integer', Rule::exists('cities', 'id')->where( fn ($q) => $q->where('state_id', $this->input('state_id')) ),`
- `pincode`: `'nullable', 'string', 'max:20'`
- `port_id`: `'nullable', 'integer', Rule::exists('ports', 'id')`
- `agent_id`: `'nullable', 'integer', Rule::exists('agents', 'id') ->where('agent_type', 'buyer') ->whereNull('deleted_at'),`
- `agent_commission_type`: `'nullable', 'required_with:agent_commission_value', Rule::in(['percent', 'amount'`
- `agent_commission_value`: `'nullable', 'numeric', 'min:0', 'max:99999999.9999'`
- `payment_term_id`: `'nullable', 'integer', Rule::exists('payment_terms', 'id')`
- `advance_percent`: `'nullable', 'numeric', 'min:0.01', 'max:99.99'`
- `sight_percent`: `'nullable', 'numeric', 'min:0.01', 'max:99.99'`
- `incoterm_id`: `'nullable', 'integer', Rule::exists('incoterms', 'id')`
- `currency_id`: `'nullable', 'integer', Rule::exists('currencies', 'id')`
- `currency_ids`: `'nullable', 'array'`
- `currency_ids.*`: `'integer', Rule::exists('currencies', 'id')`
- `incoterm_ids`: `'nullable', 'array'`
- `incoterm_ids.*`: `'integer', Rule::exists('incoterms', 'id')`
- `shipment_method`: `'nullable', 'string', 'max:120'`
- `bank_name`: `'nullable', 'string', 'max:120'`
- `account_number`: `'nullable', 'string', 'max:40'`
- `swift_code`: `'nullable', 'string', 'max:20'`
- `carton_markings`: `'nullable', 'array', 'max:20'`
- `carton_markings.*.label`: `'required_with:carton_markings.*.value', 'nullable', 'string', 'max:60'`
- `carton_markings.*.value`: `'nullable', 'string', 'max:120'`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`
- `comments`: `'nullable', 'string', 'max:1000'`

---

## UpdateProductRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## UpdateSupplierRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## UpdateAgentRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## StoreDocumentFormatRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## StoreBuyerRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## UpdateMarkupRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## SupplierRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique
- Rule::exists

**Rules Outline:**
- `display_code`: `'required', 'string', 'max:5', 'regex:/^[A-Z0-9-`
- `party_type`: `'required', Rule::in(array_keys(Supplier::PARTY_TYPES))`
- `company_name`: `'required', 'string', 'max:200'`
- `name_on_bill`: `'nullable', 'string', 'max:200'`
- `supplier_type_id`: `'nullable', 'integer', Rule::exists('supplier_types', 'id')->where('status', 'active'),`
- `product_ids`: `'nullable', 'array'`
- `product_ids.*`: `'integer', Rule::exists('products', 'id')`
- `gst_number`: `Rule::requiredIf(fn () => $this->supplierTypeIsRegistered()), 'nullable', 'string', 'size:15', 'regex:/^[0-9`
- `pan_number`: `'nullable', 'string', 'size:10', 'regex:/^[A-Z`
- `is_msme`: `'boolean'`
- `msme_registration_no`: `'required_if:is_msme,true', 'nullable', 'string', 'max:40'`
- `contact_name`: `'nullable', 'string', 'max:120'`
- `contact_designation_id`: `'nullable', 'integer', Rule::exists('designations', 'id')->where('status', 'active')`
- `contact_email`: `'nullable', 'email', 'max:150'`
- `contact_mobile`: `'nullable', 'string', 'max:30'`
- `contacts`: `'nullable', 'array'`
- `contacts.*.name`: `'required_with:contacts.*.mobile,contacts.*.email,contacts.*.designation_id', 'nullable', 'string', 'max:120'`
- `contacts.*.designation_id`: `'nullable', 'integer', Rule::exists('designations', 'id')->where('status', 'active')`
- `contacts.*.mobile`: `'nullable', 'string', 'max:30'`
- `contacts.*.email`: `'nullable', 'email', 'max:150'`
- `address`: `'nullable', 'string', 'max:255'`
- `country_id`: `'nullable', 'integer', Rule::exists('countries', 'id')`
- `state_id`: `'nullable', 'integer', Rule::exists('states', 'id')->where( fn ($q) => $q->where('country_id', $this->input('country_id')) ),`
- `city_id`: `'nullable', 'integer', Rule::exists('cities', 'id')->where( fn ($q) => $q->where('state_id', $this->input('state_id')) ),`
- `pincode`: `'nullable', 'string', 'max:20'`
- `category_ids`: `'nullable', 'array'`
- `category_ids.*`: `'integer', Rule::exists('categories', 'id')`
- `discount_percent`: `'nullable', 'numeric', 'min:0', 'max:99.99'`
- `credit_days`: `'nullable', 'integer', 'min:0', 'max:999'`
- `bank_name`: `'nullable', 'string', 'max:120'`
- `account_number`: `'nullable', 'string', 'max:40'`
- `ifsc_code`: `'nullable', 'string', 'size:11', 'regex:/^[A-Z`
- `agent_id`: `'nullable', 'integer', Rule::exists('agents', 'id') ->whereIn('agent_type', $this->allowedAgentSides()) ->whereNull('deleted_at'),`
- `agent_commission_type`: `'nullable', 'required_with:agent_commission_value', Rule::in(['percent', 'amount'`
- `agent_commission_value`: `'nullable', 'numeric', 'min:0', 'max:99999999.9999'`
- `we_supply_material`: `'boolean'`
- `requires_sample_approval`: `'boolean'`
- `default_delivery_mode`: `'required', Rule::in(array_keys(Supplier::DELIVERY_MODES))`
- `buyer_ids`: `'nullable', 'array'`
- `buyer_ids.*`: `'integer', Rule::exists('buyers', 'id')`
- `client_details`: `'nullable', 'string', 'max:2000'`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`
- `comments`: `'nullable', 'string', 'max:1000'`

---

## UpdateFobValueRequest

**Authorization (`authorize()`):** `$this->user()->can('fob-value.edit')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique

**Rules Outline:**
- `name`: `'required', 'string', 'max:120', Rule::unique('fob_values', 'name')->ignore($fobValueId)`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`

---

## MarkupRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique
- Rule::exists

**Rules Outline:**
- `supplier_id`: `'required', 'integer', Rule::exists('suppliers', 'id')->whereNull('deleted_at')->where('status', 'active'),`
- `buyer_id`: `'required', 'integer', Rule::exists('buyers', 'id')->whereNull('deleted_at')->where('status', 'active'), /* * One rule per pair — "Applied per CP at OC / PO entry" has to * resolve to exactly one answer. * * Deliberately NOT excluding soft-deleted rows: the database * index does not either, so excluding them here would let * validation pass and the insert then fail on a duplicate key. * Restore the deleted rule rather than recreating it. */ Rule::unique('markups', 'buyer_id') ->where('supplier_id', $this->input('supplier_id')) ->ignore($this->ignoreId()),`
- `markup_percent`: `'required', 'numeric', 'min:0', 'max:999.99'`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`

---

## AgentRequest

**Authorization (`authorize()`):** `$this->user()->can($this->permission())`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique
- Rule::exists

**Rules Outline:**
- `agent_type`: `'required', Rule::in(array_keys(Agent::TYPES))`
- `name`: `'required', 'string', 'max:200'`
- `display_code`: `'required', 'string', 'max:5', 'regex:/^[A-Z0-9`
- `categories`: `'required', 'array', 'min:1'`
- `categories.*`: `'integer', Rule::exists('categories', 'id')`
- `phone`: `'required', 'string', 'max:30'`
- `city`: `'required', 'string', 'max:80'`
- `address`: `'required', 'string', 'max:255'`
- `bank_name`: `'required', 'string', 'max:120'`
- `account_number`: `'required', 'string', 'max:40'`
- `calculation_basis_id`: `'required', 'integer', Rule::exists('calculation_bases', 'id')`
- `commissions`: `'required', 'array', 'min:1'`
- `commissions.*.commission_type`: `'required', Rule::in(array_keys(AgentCommission::TYPES))`
- `commissions.*.amount`: `'required', 'numeric', 'min:0', 'max:99999999.9999'`
- `commissions.*.currency_id`: `'nullable', 'integer', Rule::exists('currencies', 'id')`
- `commission_paid_by`: `'required', Rule::in(array_keys(Agent::COMMISSION_PAYERS))`
- `payment_term`: `'required', Rule::in(array_keys(Agent::PAYMENT_TERMS))`
- `payment_term_custom`: `Rule::requiredIf(fn () => $this->input('payment_term') === 'custom'), 'nullable', 'string', 'max:255',`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`
- `comments`: `'nullable', 'string', 'max:1000'`

---

## StoreProductRequest

**Authorization (`authorize()`):** `Custom logic`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- Rules defined dynamically or could not be parsed via simple regex.

---

## StoreFobValueRequest

**Authorization (`authorize()`):** `$this->user()->can('fob-value.create')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::unique

**Rules Outline:**
- `name`: `'required', 'string', 'max:120', Rule::unique('fob_values', 'name')`
- `status`: `'required', Rule::in(['active', 'inactive'`
- `remarks`: `'nullable', 'string', 'max:1000'`

---

## UpdateExportDocumentRequest

**Authorization (`authorize()`):** `$this->user()->can('export-document.edit')`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- Rule::exists

**Rules Outline:**
- `incoterm_id`: `'nullable', 'integer', Rule::exists('incoterms', 'id')`
- `port_of_loading_id`: `'nullable', 'integer', Rule::exists('ports', 'id')`
- `port_of_discharge_id`: `'nullable', 'integer', Rule::exists('ports', 'id')`
- `shipment_method_id`: `'nullable', 'integer', Rule::exists('shipment_methods', 'id')`
- `shipment_date`: `'nullable', 'date'`
- `remarks`: `'nullable', 'string', 'max:2000'`
- `invoice_no`: `'nullable', 'string', 'max:60'`
- `invoice_date`: `'nullable', 'date'`
- `exporter_ref`: `'nullable', 'string', 'max:255'`
- `buyer_ref_no`: `'nullable', 'string', 'max:60'`
- `buyer_ref_date`: `'nullable', 'date'`
- `other_reference`: `'nullable', 'string', 'max:255'`
- `consignee_name`: `'nullable', 'string', 'max:200'`
- `consignee_address`: `'nullable', 'string', 'max:1000'`
- `pre_carriage_by`: `'nullable', 'string', 'max:60'`
- `place_of_receipt`: `'nullable', 'string', 'max:150'`
- `vessel_flight_no`: `'nullable', 'string', 'max:60'`
- `country_of_origin`: `'nullable', 'string', 'max:60'`
- `forwarder_name`: `'nullable', 'string', 'max:150'`
- `forwarder_address`: `'nullable', 'string', 'max:1000'`
- `vehicle_no`: `'nullable', 'string', 'max:60'`
- `driver_cell`: `'nullable', 'string', 'max:30'`
- `final_destination`: `'nullable', 'string', 'max:150'`
- `marks_and_numbers`: `'nullable', 'string', 'max:2000'`
- `total_cartons`: `'nullable', 'integer', 'min:0', 'max:999999'`
- `package_kind`: `'nullable', 'string', 'max:40'`
- `freight_amount`: `'nullable', 'numeric', 'min:0', 'max:9999999999.99'`
- `insurance_amount`: `'nullable', 'numeric', 'min:0', 'max:9999999999.99'`
- `gross_weight`: `'nullable', 'numeric', 'min:0', 'max:9999999999.999'`
- `net_weight`: `'nullable', 'numeric', 'min:0', 'max:9999999999.999'`
- `carton_dimensions`: `'nullable', 'string', 'max:60'`
- `booking_no`: `'nullable', 'string', 'max:60'`
- `bl_no`: `'nullable', 'string', 'max:60'`
- `voyage_no`: `'nullable', 'string', 'max:60'`
- `transshipment_port`: `'nullable', 'string', 'max:150'`
- `notify_party_name`: `'nullable', 'string', 'max:200'`
- `notify_party_address`: `'nullable', 'string', 'max:1000'`
- `goods_description`: `'nullable', 'string', 'max:1000'`
- `total_measurement`: `'nullable', 'numeric', 'min:0', 'max:9999999999.999'`
- `ex_rate`: `'nullable', 'string', 'max:60'`
- `freight_terms`: `'nullable', Rule::in(['PREPAID', 'COLLECT'`
- `freight_prepaid_at`: `'nullable', 'string', 'max:100'`
- `freight_payable_at`: `'nullable', 'string', 'max:100'`
- `total_prepaid_in`: `'nullable', 'string', 'max:150'`
- `no_of_original_bls`: `'nullable', 'string', 'max:40'`
- `bl_place_of_issue`: `'nullable', 'string', 'max:100'`
- `bl_date_of_issue`: `'nullable', 'date'`
- `cartons`: `'nullable', 'array', 'max:200'`
- `cartons.*.carton_no`: `'required_with:cartons.*.lines', 'nullable', 'string', 'max:40'`
- `cartons.*.net_weight`: `'nullable', 'numeric', 'min:0', 'max:99999999.999'`
- `cartons.*.gross_weight`: `'nullable', 'numeric', 'min:0', 'max:99999999.999'`
- `cartons.*.dimensions`: `'nullable', 'string', 'max:60'`
- `cartons.*.lines`: `'nullable', 'array', 'max:100'`
- `cartons.*.lines.*.description`: `'required_with:cartons.*.lines.*.qty', 'nullable', 'string', 'max:500'`
- `cartons.*.lines.*.unit`: `'nullable', 'string', 'max:20'`
- `cartons.*.lines.*.qty`: `'nullable', 'integer', 'min:0', 'max:999999'`

---

## ExtractDocumentRequest

**Authorization (`authorize()`):** `$this->user()?->can('export-document.edit') ?? false`

**Hooks Used:**
- `prepareForValidation()`
- `passedValidation()`
- `messages()`

**Database Checks (Exists/Unique):**
- None

**Rules Outline:**
- `file`: `'required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,gif,pdf'`
- `type_code`: `'required', 'string', Rule::in(GeminiDocumentExtractor::UPLOADED_TYPES),`

---

