# Garment ERP Entity Relationship Diagram

\`\`\`mermaid
erDiagram
    %% Access Control
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : has
    ROLES ||--o{ ROLE_PERMISSIONS : grants
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : includes

    %% Masters
    BUYERS ||--o{ INQUIRIES : places
    BUYERS ||--o{ ORDER_CONFIRMATIONS : confirms
    STYLES ||--o{ STYLE_COSTINGS : has
    STYLES ||--o{ STYLE_BOMS : defines
    STYLE_BOMS ||--o{ STYLE_BOM_ITEMS : requires
    ITEMS ||--o{ STYLE_BOM_ITEMS : is_used_in
    SUPPLIERS ||--o{ PURCHASE_ORDERS : fulfills
    SUPPLIERS ||--o{ JOB_WORK_ISSUES : receives

    %% Sales & Orders
    INQUIRIES ||--o| ORDER_CONFIRMATIONS : converted_to
    ORDER_CONFIRMATIONS ||--o{ ORDER_CONFIRMATION_ITEMS : details
    ORDER_CONFIRMATIONS ||--o{ WORK_ORDERS : initiates
    ORDER_CONFIRMATIONS ||--o{ PURCHASE_ORDERS : drives
    ORDER_CONFIRMATIONS ||--o{ EXPORT_DOCUMENTS : generates

    %% Manufacturing Processes
    WORK_ORDERS ||--o{ TIME_AND_ACTION : tracked_by
    WORK_ORDERS ||--o{ PRODUCTION_STAGES : progresses_through
    PRODUCTION_STAGES ||--o{ PRODUCTION_STAGE_SIZES : breaks_down_into
    PRODUCTION_STAGES ||--o{ CAPA_RECORDS : triggers

    %% Quality
    DEFECT_CODES ||--o{ CAPA_RECORDS : categorized_as

    %% Inventory & Job Work
    PURCHASE_ORDERS ||--o{ GOODS_INWARDS : receives
    GOODS_INWARDS ||--o{ STOCK_LEDGERS : updates
    ITEMS ||--o{ STOCK_BALANCES : stored_as
    GODOWNS ||--o{ STOCK_BALANCES : holds
    STOCK_LEDGERS }|--|| STOCK_BALANCES : calculates
    JOB_WORK_ISSUES ||--o{ JOB_WORK_RECEIVES : reconciled_by
    JOB_WORK_RECEIVES ||--o| DEBIT_NOTES : generates_if_damaged

    %% Packing, Export & Finance
    EXPORT_DOCUMENTS ||--o{ PACKING_CARTONS : packs
    EXPORT_DOCUMENTS ||--o{ OCR_VALIDATIONS : validated_by
    EXPORT_DOCUMENTS ||--o{ PURCHASE_BILLS : links_finance
\`\`\`
