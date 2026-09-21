# Guru Traders ERP - Business Logic / Services Inventory

## OrderConfirmationService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$oc->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\OrderConfirmation $oc`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$oc->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `convertFromInquiry()`

**Inputs:**
- `App\Models\Inquiry $inquiry`

**Models Involved:**
- None

**Database Writes:**
- `$oc->save(`
- `$sourceItem->update(`
- `$inquiry->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `raisePurchaseOrders()`

**Inputs:**
- `App\Models\OrderConfirmation $oc`
- `array $itemIds`

**Models Involved:**
- None

**Database Writes:**
- `$po->save(`
- `$ocItem->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

---

## InquiryService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$inquiry->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\Inquiry $inquiry`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$inquiry->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

---

## RoleService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- Role

**Database Writes:**
- `Role::create`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `Spatie\Permission\Models\Role $role`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$role->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `Spatie\Permission\Models\Role $role`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `delete()`

**Inputs:**
- `Spatie\Permission\Models\Role $role`

**Models Involved:**
- None

**Database Writes:**
- `$role->delete(`

**Transactions:** no

**Calculations Detected:**
- None found

---

## InwardEntryService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- PurchaseOrder

**Database Writes:**
- `PurchaseOrder::find`
- `$inward->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\InwardEntry $inward`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$inward->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `approve()`

**Inputs:**
- `App\Models\InwardEntry $inward`
- `array $qcData`
- `int $userId`

**Models Involved:**
- InwardEntryItem

**Database Writes:**
- `InwardEntryItem::where`
- `$inward->update(`
- `$item->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `delete()`

**Inputs:**
- `App\Models\InwardEntry $inward`

**Models Involved:**
- PurchaseOrderTimelineEntry

**Database Writes:**
- `PurchaseOrderTimelineEntry::where`
- `$inward->delete(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `updatePurchaseOrderStatusAndTimeline()`

**Inputs:**
- `App\Models\PurchaseOrder $po`
- `App\Models\InwardEntry $inward`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `recalculatePoStatus()`

**Inputs:**
- `App\Models\PurchaseOrder $po`

**Models Involved:**
- InwardEntryItem

**Database Writes:**
- `InwardEntryItem::query`
- `$po->update(`

**Transactions:** no

**Calculations Detected:**
- None found

---

## PurchaseOrderService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- PurchaseOrder

**Database Writes:**
- `PurchaseOrder::create`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\PurchaseOrder $po`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$po->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

---

## AgentService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- Agent

**Database Writes:**
- `Agent::create`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\Agent $agent`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$agent->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\Agent $agent`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## MarkupService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$markup->save(`

**Transactions:** no

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\Markup $markup`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$markup->update(`

**Transactions:** no

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\Markup $markup`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `preview()`

**Inputs:**
- `App\Models\Markup $markup`
- `float $costPrice`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## CategoryService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$category->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\Category $category`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$category->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\Category $category`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## SupplierService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- Supplier

**Database Writes:**
- `Supplier::create`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\Supplier $supplier`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$supplier->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\Supplier $supplier`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## ProductService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- Product

**Database Writes:**
- `Product::create`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\Product $product`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$product->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\Product $product`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## BuyerService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$buyer->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\Buyer $buyer`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$buyer->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\Buyer $buyer`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## DocumentFormatService

### `create()`

**Inputs:**
- `array $data`

**Models Involved:**
- DocumentFormat

**Database Writes:**
- `DocumentFormat::create`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\DocumentFormat $format`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$format->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\DocumentFormat $format`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `delete()`

**Inputs:**
- `App\Models\DocumentFormat $format`

**Models Involved:**
- None

**Database Writes:**
- `$format->delete(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `defaults()`

**Inputs:**
- None

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## GeminiDocumentExtractor

### `isConfigured()`

**Inputs:**
- None

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `supports()`

**Inputs:**
- `string $typeCode`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `isPhase1()`

**Inputs:**
- `string $typeCode`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `phase1Labels()`

**Inputs:**
- None

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

### `extract()`

**Inputs:**
- `Illuminate\Http\UploadedFile $file`
- `string $typeCode`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

## ExportDocumentService

### `raiseFromOrderConfirmation()`

**Inputs:**
- `App\Models\OrderConfirmation $oc`
- `array $itemIds`

**Models Involved:**
- None

**Database Writes:**
- `$doc->save(`
- `$ocItem->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `ensureChecklist()`

**Inputs:**
- `App\Models\ExportDocument $doc`

**Models Involved:**
- DocumentChecklistType
- ExportDocumentChecklist

**Database Writes:**
- `DocumentChecklistType::query`
- `ExportDocumentChecklist::query`

**Transactions:** no

**Calculations Detected:**
- None found

### `recordChecklist()`

**Inputs:**
- `App\Models\ExportDocumentChecklist $entry`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$entry->save(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `attachGeneratedFile()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `string $typeCode`
- `string $variantCode`
- `string $storedPath`
- `string $originalName`

**Models Involved:**
- None

**Database Writes:**
- `$entry->update(`

**Transactions:** no

**Calculations Detected:**
- None found

### `syncCartons()`

**Inputs:**
- `App\Models\ExportDocument $document`
- `array $rows`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** yes

**Calculations Detected:**
- None found

### `resetChecklist()`

**Inputs:**
- `App\Models\ExportDocumentChecklist $entry`

**Models Involved:**
- None

**Database Writes:**
- `$entry->update(`

**Transactions:** no

**Calculations Detected:**
- None found

---

## NumberSeriesService

### `next()`

**Inputs:**
- `string $module`
- `string $financialYear`

**Models Involved:**
- NumberSeries

**Database Writes:**
- `NumberSeries::query`

**Transactions:** yes

**Calculations Detected:**
- None found

### `preview()`

**Inputs:**
- `string $module`
- `string $financialYear`

**Models Involved:**
- NumberSeries

**Database Writes:**
- `NumberSeries::query`

**Transactions:** no

**Calculations Detected:**
- None found

### `nextNumber()`

**Inputs:**
- `string $module`
- `string $financialYear`

**Models Involved:**
- NumberSeries

**Database Writes:**
- `NumberSeries::query`

**Transactions:** yes

**Calculations Detected:**
- None found

---

## UserService

### `create()`

**Inputs:**
- `array $data`
- `App\Models\User $creator`

**Models Involved:**
- User

**Database Writes:**
- `User::create`

**Transactions:** yes

**Calculations Detected:**
- None found

### `update()`

**Inputs:**
- `App\Models\User $user`
- `array $data`

**Models Involved:**
- None

**Database Writes:**
- `$user->update(`

**Transactions:** yes

**Calculations Detected:**
- None found

### `canDelete()`

**Inputs:**
- `App\Models\User $user`
- `App\Models\User $actor`

**Models Involved:**
- None

**Database Writes:**
- None found via static regex

**Transactions:** no

**Calculations Detected:**
- None found

---

