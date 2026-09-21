# Guru Traders ERP - Controller Inventory

## Controller

**Namespace:** `App\Http\Controllers`

---

## PermissionController

**Namespace:** `App\Http\Controllers\UserManagement`

**Middleware:**
- permission:permission.view
- permission:permission.sync

**Constructor Dependencies:**
- PermissionRegistry

### `__construct()`

**Inputs:**
- `App\Support\PermissionRegistry $registry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Permission

**Database Operations / Queries:**
- `Permission::with`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `sync()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## UserController

**Namespace:** `App\Http\Controllers\UserManagement`

**Middleware:**
- permission:user.view
- permission:user.create
- permission:user.edit
- permission:user.delete

**Constructor Dependencies:**
- UserService

### `__construct()`

**Inputs:**
- `App\Services\UserService $users`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- User

**Database Operations / Queries:**
- `User::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Role

**Database Operations / Queries:**
- `Role::with`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `store()`

**Inputs:**
- `App\Http\Requests\UserManagement\StoreUserRequest $request`

**FormRequests:**
- StoreUserRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\User $user`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\User $user`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Role

**Database Operations / Queries:**
- `Role::with`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\UserManagement\UpdateUserRequest $request`
- `App\Models\User $user`

**FormRequests:**
- UpdateUserRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `Illuminate\Http\Request $request`
- `App\Models\User $user`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$user->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `Illuminate\Http\Request $request`
- `App\Models\User $user`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$user->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## RoleController

**Namespace:** `App\Http\Controllers\UserManagement`

**Middleware:**
- permission:role.view
- permission:role.create
- permission:role.edit
- permission:role.delete

**Constructor Dependencies:**
- RoleService
- PermissionRegistry

### `__construct()`

**Inputs:**
- `App\Services\RoleService $roles`
- `App\Support\PermissionRegistry $registry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Role

**Database Operations / Queries:**
- `Role::with`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `store()`

**Inputs:**
- `App\Http\Requests\UserManagement\StoreRoleRequest $request`

**FormRequests:**
- StoreRoleRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `Spatie\Permission\Models\Role $role`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `Spatie\Permission\Models\Role $role`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\UserManagement\UpdateRoleRequest $request`
- `Spatie\Permission\Models\Role $role`

**FormRequests:**
- UpdateRoleRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `Spatie\Permission\Models\Role $role`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

---

## OrderConfirmationController

**Namespace:** `App\Http\Controllers\Sales`

**Middleware:**
- permission:order-confirmation.view
- permission:order-confirmation.create
- permission:order-confirmation.edit
- permission:order-confirmation.delete
- permission:order-confirmation.approve

**Constructor Dependencies:**
- OrderConfirmationService

### `__construct()`

**Inputs:**
- `App\Services\Sales\OrderConfirmationService $confirmations`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- OrderConfirmation

**Database Operations / Queries:**
- `OrderConfirmation::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('sales.order-confirmations.create', $this->formData()`

### `store()`

**Inputs:**
- `App\Http\Requests\Sales\StoreOrderConfirmationRequest $request`

**FormRequests:**
- StoreOrderConfirmationRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\OrderConfirmation $orderConfirmation`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\OrderConfirmation $orderConfirmation`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('sales.order-confirmations.edit', $this->formData()`

### `update()`

**Inputs:**
- `App\Http\Requests\Sales\UpdateOrderConfirmationRequest $request`
- `App\Models\OrderConfirmation $orderConfirmation`

**FormRequests:**
- UpdateOrderConfirmationRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\OrderConfirmation $orderConfirmation`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$orderConfirmation->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `convertFromInquiry()`

**Inputs:**
- `App\Models\Inquiry $inquiry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `raisePurchaseOrders()`

**Inputs:**
- `Illuminate\Http\Request $request`
- `App\Models\OrderConfirmation $orderConfirmation`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

---

## InquiryController

**Namespace:** `App\Http\Controllers\Sales`

**Middleware:**
- permission:inquiry.view
- permission:inquiry.create
- permission:inquiry.edit
- permission:inquiry.delete
- permission:inquiry.create|inquiry.edit

**Constructor Dependencies:**
- InquiryService
- NumberSeriesService

### `__construct()`

**Inputs:**
- `App\Services\Sales\InquiryService $inquiries`
- `App\Services\NumberSeriesService $numbers`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Inquiry

**Database Operations / Queries:**
- `Inquiry::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('sales.inquiries.create', $this->formData()`

### `store()`

**Inputs:**
- `App\Http\Requests\Sales\StoreInquiryRequest $request`

**FormRequests:**
- StoreInquiryRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Inquiry $inquiry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Inquiry $inquiry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('sales.inquiries.edit', $this->formData()`

### `update()`

**Inputs:**
- `App\Http\Requests\Sales\UpdateInquiryRequest $request`
- `App\Models\Inquiry $inquiry`

**FormRequests:**
- UpdateInquiryRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `pdf()`

**Inputs:**
- `App\Models\Inquiry $inquiry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `xlsx()`

**Inputs:**
- `App\Models\Inquiry $inquiry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `destroy()`

**Inputs:**
- `App\Models\Inquiry $inquiry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$inquiry->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `storeSource()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['id' => $source->id, 'name' => $source->name])`

### `products()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json($products)`

### `suppliers()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json($suppliers)`

---

## DashboardController

**Namespace:** `App\Http\Controllers`

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- ExportDocument
- PurchaseOrder
- Inquiry
- OrderConfirmation

**Database Operations / Queries:**
- `ExportDocument::where`
- `PurchaseOrder::with`
- `ExportDocument::with`
- `Inquiry::query`
- `OrderConfirmation::query`
- `PurchaseOrder::query`
- `ExportDocument::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## ProfileController

**Namespace:** `App\Http\Controllers`

### `edit()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\ProfileUpdateRequest $request`

**FormRequests:**
- ProfileUpdateRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `destroy()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$user->delete(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## InwardEntryController

**Namespace:** `App\Http\Controllers\Procurement`

**Middleware:**
- permission:inward-entry.view
- permission:inward-entry.create
- permission:inward-entry.edit
- permission:inward-entry.delete
- permission:inward-entry.approve

**Constructor Dependencies:**
- InwardEntryService

### `__construct()`

**Inputs:**
- `App\Services\Procurement\InwardEntryService $inwardEntries`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- InwardEntry
- PurchaseOrder

**Database Operations / Queries:**
- `InwardEntry::query`
- `PurchaseOrder::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('procurement.inward-entries.create', $this->formData()`

### `store()`

**Inputs:**
- `App\Http\Requests\Procurement\StoreInwardEntryRequest $request`

**FormRequests:**
- StoreInwardEntryRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\InwardEntry $inwardEntry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\InwardEntry $inwardEntry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('procurement.inward-entries.edit', $this->formData()`

### `update()`

**Inputs:**
- `App\Http\Requests\Procurement\UpdateInwardEntryRequest $request`
- `App\Models\InwardEntry $inwardEntry`

**FormRequests:**
- UpdateInwardEntryRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `approve()`

**Inputs:**
- `App\Http\Requests\Procurement\ApproveInwardEntryRequest $request`
- `App\Models\InwardEntry $inwardEntry`

**FormRequests:**
- ApproveInwardEntryRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\InwardEntry $inwardEntry`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `poDetails()`

**Inputs:**
- `App\Models\PurchaseOrder $purchaseOrder`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- InwardEntryItem

**Database Operations / Queries:**
- `InwardEntryItem::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## PurchaseOrderController

**Namespace:** `App\Http\Controllers\Procurement`

**Middleware:**
- permission:purchase-order.view
- permission:purchase-order.create
- permission:purchase-order.edit
- permission:purchase-order.delete

**Constructor Dependencies:**
- PurchaseOrderService

### `__construct()`

**Inputs:**
- `App\Services\Procurement\PurchaseOrderService $purchaseOrders`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- PurchaseOrder

**Database Operations / Queries:**
- `PurchaseOrder::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('procurement.purchase-orders.create', $this->formData()`

### `store()`

**Inputs:**
- `App\Http\Requests\Procurement\StorePurchaseOrderRequest $request`

**FormRequests:**
- StorePurchaseOrderRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\PurchaseOrder $purchaseOrder`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\PurchaseOrder $purchaseOrder`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('procurement.purchase-orders.edit', $this->formData()`

### `update()`

**Inputs:**
- `App\Http\Requests\Procurement\UpdatePurchaseOrderRequest $request`
- `App\Models\PurchaseOrder $purchaseOrder`

**FormRequests:**
- UpdatePurchaseOrderRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\PurchaseOrder $purchaseOrder`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$purchaseOrder->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

---

## FinanceController

**Namespace:** `App\Http\Controllers\Finance`

### `purchaseBills()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- ExportDocumentChecklist

**Database Operations / Queries:**
- `ExportDocumentChecklist::query`

**Transactions:** no

**Responses / Side Effects:**
- `return view('finance.purchase-bills.index', compact('rows')`

### `debitNotes()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- PurchaseOrder

**Database Operations / Queries:**
- `PurchaseOrder::query`

**Transactions:** no

**Responses / Side Effects:**
- `return view('finance.debit-notes.index', compact('purchaseOrders')`

### `supplierPayments()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- PurchaseOrder

**Database Operations / Queries:**
- `PurchaseOrder::query`

**Transactions:** no

**Responses / Side Effects:**
- `return view('finance.supplier-payments.index', compact('purchaseOrders')`

### `buyerReceipts()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- ExportDocument

**Database Operations / Queries:**
- `ExportDocument::query`

**Transactions:** no

**Responses / Side Effects:**
- `return view('finance.buyer-receipts.index', compact('documents')`

### `agentCommission()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- PurchaseOrder

**Database Operations / Queries:**
- `PurchaseOrder::query`

**Transactions:** no

**Responses / Side Effects:**
- `return view('finance.agent-commission.index', compact('purchaseOrders')`

---

## CompanyProfileController

**Namespace:** `App\Http\Controllers\Administration`

**Middleware:**
- permission:company-profile.view
- permission:company-profile.edit

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Administration\UpdateCompanyProfileRequest $request`

**FormRequests:**
- UpdateCompanyProfileRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$profile->update(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

---

## JobberController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:jobber.view|supplier.view
- permission:jobber.create|supplier.create
- permission:jobber.edit|supplier.edit
- permission:jobber.delete|supplier.delete

**Constructor Dependencies:**
- SupplierService

### `__construct()`

**Inputs:**
- `App\Services\Masters\SupplierService $suppliers`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Supplier

**Database Operations / Queries:**
- `Supplier::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreSupplierRequest $request`

**FormRequests:**
- StoreSupplierRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Supplier $jobber`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Supplier $jobber`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateSupplierRequest $request`
- `App\Models\Supplier $jobber`

**FormRequests:**
- UpdateSupplierRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\Supplier $jobber`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$jobber->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\Supplier $jobber`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$jobber->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `checkCode()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Supplier

**Database Operations / Queries:**
- `Supplier::query`

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['available' => ! $taken])`

### `agents()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## MarkupController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:markup.view
- permission:markup.create
- permission:markup.edit
- permission:markup.delete

**Constructor Dependencies:**
- MarkupService

### `__construct()`

**Inputs:**
- `App\Services\Masters\MarkupService $markups`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Markup

**Database Operations / Queries:**
- `Markup::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('masters.markups.create', array_merge($this->formData()`

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreMarkupRequest $request`

**FormRequests:**
- StoreMarkupRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Markup $markup`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Markup $markup`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('masters.markups.edit', array_merge($this->formData($markup)`

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateMarkupRequest $request`
- `App\Models\Markup $markup`

**FormRequests:**
- UpdateMarkupRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\Markup $markup`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$markup->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\Markup $markup`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$markup->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `supplierDiscount()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Supplier

**Database Operations / Queries:**
- `Supplier::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `supplierAgentCommission()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Supplier

**Database Operations / Queries:**
- `Supplier::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `buyerAgentCommission()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Buyer

**Database Operations / Queries:**
- `Buyer::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## AgentController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:agent.view
- permission:agent.create
- permission:agent.edit
- permission:agent.delete

**Constructor Dependencies:**
- AgentService

### `__construct()`

**Inputs:**
- `App\Services\Masters\AgentService $agents`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Agent

**Database Operations / Queries:**
- `Agent::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('masters.agents.create', $this->formData()`

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreAgentRequest $request`

**FormRequests:**
- StoreAgentRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Agent $agent`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Agent $agent`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('masters.agents.edit', $this->formData($agent)`

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateAgentRequest $request`
- `App\Models\Agent $agent`

**FormRequests:**
- UpdateAgentRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\Agent $agent`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$agent->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\Agent $agent`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$agent->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `checkCode()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Agent

**Database Operations / Queries:**
- `Agent::with`

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['message' => 'Unknown field.'], 422)`
- `return response()->json(['available' => ! $taken])`

---

## GeoController

**Namespace:** `App\Http\Controllers\Masters`

### `states()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- State

**Database Operations / Queries:**
- `State::query`

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json([])`

### `cities()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- City

**Database Operations / Queries:**
- `City::query`

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json([])`

---

## BuyerController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:buyer.view
- permission:buyer.create
- permission:buyer.edit
- permission:buyer.delete
- permission:buyer.create|buyer.edit

**Constructor Dependencies:**
- BuyerService
- NumberSeriesService

### `__construct()`

**Inputs:**
- `App\Services\Masters\BuyerService $buyers`
- `App\Services\NumberSeriesService $numbers`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Buyer

**Database Operations / Queries:**
- `Buyer::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreBuyerRequest $request`

**FormRequests:**
- StoreBuyerRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Buyer $buyer`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Buyer $buyer`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateBuyerRequest $request`
- `App\Models\Buyer $buyer`

**FormRequests:**
- UpdateBuyerRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\Buyer $buyer`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$buyer->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\Buyer $buyer`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$buyer->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `storePaymentTerm()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['id' => $term->id, 'name' => $term->name])`

### `storeDesignation()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['id' => $designation->id, 'name' => $designation->name])`

---

## DocumentFormatController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:po-format.view
- permission:po-format.create
- permission:po-format.edit
- permission:po-format.delete

**Constructor Dependencies:**
- DocumentFormatService

### `__construct()`

**Inputs:**
- `App\Services\Masters\DocumentFormatService $formats`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- DocumentFormat

**Database Operations / Queries:**
- `DocumentFormat::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreDocumentFormatRequest $request`

**FormRequests:**
- StoreDocumentFormatRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\DocumentFormat $format`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\DocumentFormat $format`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateDocumentFormatRequest $request`
- `App\Models\DocumentFormat $format`

**FormRequests:**
- UpdateDocumentFormatRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\DocumentFormat $format`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\DocumentFormat $format`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$format->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## ProductController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:product.view
- permission:product.create
- permission:product.edit
- permission:product.delete
- permission:product.create|product.edit

**Constructor Dependencies:**
- ProductService

### `__construct()`

**Inputs:**
- `App\Services\Masters\ProductService $products`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Product

**Database Operations / Queries:**
- `Product::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('masters.products.create', $this->formData()`

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreProductRequest $request`

**FormRequests:**
- StoreProductRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Product $product`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Product $product`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('masters.products.edit', $this->formData($product)`

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateProductRequest $request`
- `App\Models\Product $product`

**FormRequests:**
- UpdateProductRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\Product $product`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$product->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\Product $product`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$product->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `checkCode()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Product

**Database Operations / Queries:**
- `Product::with`

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['message' => 'Unknown field.'], 422)`
- `return response()->json(['available' => ! $taken])`

### `storeGstRate()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['message' => 'Enter a GST rate between 0 and 100.'], 422)`
- `return response()->json(['id' => $gstRate->id, 'name' => $gstRate->label])`

---

## FobValueController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:fob-value.view
- permission:fob-value.create
- permission:fob-value.edit
- permission:fob-value.delete

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- FobValue

**Database Operations / Queries:**
- `FobValue::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('masters.fob-values.create')`

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreFobValueRequest $request`

**FormRequests:**
- StoreFobValueRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- FobValue

**Database Operations / Queries:**
- `FobValue::create`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\FobValue $fobValue`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\FobValue $fobValue`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateFobValueRequest $request`
- `App\Models\FobValue $fobValue`

**FormRequests:**
- UpdateFobValueRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$fobValue->update(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\FobValue $fobValue`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$fobValue->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\FobValue $fobValue`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$fobValue->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## CategoryController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:category.view
- permission:category.create
- permission:category.edit
- permission:category.delete

**Constructor Dependencies:**
- CategoryService
- NumberSeriesService

### `__construct()`

**Inputs:**
- `App\Services\Masters\CategoryService $categories`
- `App\Services\NumberSeriesService $numbers`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Category

**Database Operations / Queries:**
- `Category::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreCategoryRequest $request`

**FormRequests:**
- StoreCategoryRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Category $category`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Category $category`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateCategoryRequest $request`
- `App\Models\Category $category`

**FormRequests:**
- UpdateCategoryRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\Category $category`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$category->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\Category $category`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$category->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## SupplierController

**Namespace:** `App\Http\Controllers\Masters`

**Middleware:**
- permission:supplier.view
- permission:supplier.create
- permission:supplier.edit
- permission:supplier.delete

**Constructor Dependencies:**
- SupplierService

### `__construct()`

**Inputs:**
- `App\Services\Masters\SupplierService $suppliers`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Supplier

**Database Operations / Queries:**
- `Supplier::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `create()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `store()`

**Inputs:**
- `App\Http\Requests\Masters\StoreSupplierRequest $request`

**FormRequests:**
- StoreSupplierRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `show()`

**Inputs:**
- `App\Models\Supplier $supplier`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\Supplier $supplier`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Masters\UpdateSupplierRequest $request`
- `App\Models\Supplier $supplier`

**FormRequests:**
- UpdateSupplierRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\Supplier $supplier`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$supplier->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `toggleStatus()`

**Inputs:**
- `App\Models\Supplier $supplier`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$supplier->update(`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `checkCode()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- Supplier

**Database Operations / Queries:**
- `Supplier::query`

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['available' => ! $taken])`

### `storeSupplierType()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- SupplierType

**Database Operations / Queries:**
- `SupplierType::where`
- `SupplierType::create`

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['id' => $type->id, 'name' => $type->name])`

### `agents()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

---

## ExportDocumentController

**Namespace:** `App\Http\Controllers\Export`

**Middleware:**
- permission:export-document.view
- permission:export-document.create
- permission:export-document.edit
- permission:export-document.delete
- permission:export-document.generate

**Constructor Dependencies:**
- ExportDocumentService

### `__construct()`

**Inputs:**
- `App\Services\Export\ExportDocumentService $documents`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- ExportDocument

**Database Operations / Queries:**
- `ExportDocument::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `show()`

**Inputs:**
- `App\Models\ExportDocument $document`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `edit()`

**Inputs:**
- `App\Models\ExportDocument $document`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `App\Http\Requests\Export\UpdateExportDocumentRequest $request`
- `App\Models\ExportDocument $document`

**FormRequests:**
- UpdateExportDocumentRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$document->update(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `deliveryChallanPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `eInvoicePdf()`

**Inputs:**
- `App\Models\ExportDocument $document`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `packingListPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $variant`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `billOfLadingDraftPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `exportInvoicePdf()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $variant`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `itemSummaryPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $variant`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `purchaseBillsPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $variant`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `vgmPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $variant`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `bankDocsPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $variant`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `buyerDocsPdf()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $variant`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `download`

### `raiseFromOrderConfirmation()`

**Inputs:**
- `Illuminate\Http\Request $request`
- `App\Models\OrderConfirmation $orderConfirmation`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

### `destroy()`

**Inputs:**
- `App\Models\ExportDocument $document`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- `$document->delete(`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

---

## PackingController

**Namespace:** `App\Http\Controllers\Export`

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- ExportDocument

**Database Operations / Queries:**
- `ExportDocument::query`

**Transactions:** no

**Responses / Side Effects:**
- `return view('export.packing.index', compact('documents')`

### `show()`

**Inputs:**
- `App\Models\ExportDocument $document`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return view('export.packing.show', compact('document', 'packingRows')`

---

## ExportDocumentOcrController

**Namespace:** `App\Http\Controllers\Export`

**Middleware:**
- permission:export-document.view
- permission:export-document.edit

**Constructor Dependencies:**
- GeminiDocumentExtractor
- ExportDocumentService

### `__construct()`

**Inputs:**
- `App\Services\Export\GeminiDocumentExtractor $ocr`
- `App\Services\Export\ExportDocumentService $documents`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- ExportDocument
- DocumentChecklistType
- ExportDocumentChecklist

**Database Operations / Queries:**
- `ExportDocument::query`
- `DocumentChecklistType::query`
- `ExportDocumentChecklist::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `extract()`

**Inputs:**
- `App\Http\Requests\Export\ExtractDocumentRequest $request`

**FormRequests:**
- ExtractDocumentRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['message' => $e->getMessage()`
- `return response()->json(['message' => 'OCR failed unexpectedly. Try again or enter fields manually.'], 500)`
- `return response()->json($result)`

### `store()`

**Inputs:**
- `Illuminate\Http\Request $request`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- ExportDocument
- DocumentChecklistType
- ExportDocumentChecklist

**Database Operations / Queries:**
- `ExportDocument::query`
- `DocumentChecklistType::query`
- `ExportDocumentChecklist::query`

**Transactions:** no

**Responses / Side Effects:**
- `return redirect()`

---

## ExportDocumentChecklistController

**Namespace:** `App\Http\Controllers\Export`

**Middleware:**
- permission:export-document.edit
- permission:export-document.view|purchase-bill.view|packing.view

**Constructor Dependencies:**
- ExportDocumentService
- GeminiDocumentExtractor

### `__construct()`

**Inputs:**
- `App\Services\Export\ExportDocumentService $documents`
- `App\Services\Export\GeminiDocumentExtractor $ocr`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `middleware()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `update()`

**Inputs:**
- `Illuminate\Http\Request $request`
- `App\Models\ExportDocument $document`
- `App\Models\ExportDocumentChecklist $checklist`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `reset()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `App\Models\ExportDocumentChecklist $checklist`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `file()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `App\Models\ExportDocumentChecklist $checklist`

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `extract()`

**Inputs:**
- `App\Http\Requests\Export\ExtractDocumentRequest $request`
- `App\Models\ExportDocument $document`
- `App\Models\ExportDocumentChecklist $checklist`

**FormRequests:**
- ExtractDocumentRequest

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- None

**Database Operations / Queries:**
- None/Obscured

**Transactions:** no

**Responses / Side Effects:**
- `return response()->json(['message' => 'Checklist type does not match the request.'], 422)`
- `return response()->json(['message' => $e->getMessage()`
- `return response()->json(['message' => 'OCR failed unexpectedly. Try again or enter fields manually.'], 500)`

---

## ReportsController

**Namespace:** `App\Http\Controllers\Reports`

### `outstanding()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- PurchaseOrder
- ExportDocument

**Database Operations / Queries:**
- `PurchaseOrder::query`
- `ExportDocument::query`

**Transactions:** no

**Responses / Side Effects:**
- None/Unknown

### `index()`

**Inputs:**
- None

**FormRequests:**
- None

**Authorization (Inline):**
- None

**Dependencies (Models/Services):**
- PurchaseOrder
- ExportDocument

**Database Operations / Queries:**
- `PurchaseOrder::query`
- `ExportDocument::query`

**Transactions:** no

**Responses / Side Effects:**
- `return view('reports.index', compact('stats')`

---

