import Joi from 'joi';

export const exportDocumentValidator = {
  update: Joi.object({
    buyer_id: Joi.number().integer().positive().required(),
    currency_id: Joi.number().integer().positive().required(),
    incoterm_id: Joi.number().integer().positive().allow(null),
    port_of_loading_id: Joi.number().integer().positive().allow(null),
    port_of_discharge_id: Joi.number().integer().positive().allow(null),
    shipment_method_id: Joi.number().integer().positive().allow(null),
    shipment_date: Joi.date().iso().allow(null, ''),

    // Header packing extensions
    invoice_no: Joi.string().max(60).allow(null, ''),
    invoice_date: Joi.date().iso().allow(null, ''),
    exporter_ref: Joi.string().max(255).allow(null, ''),
    buyer_ref_no: Joi.string().max(60).allow(null, ''),
    buyer_ref_date: Joi.date().iso().allow(null, ''),
    other_reference: Joi.string().max(255).allow(null, ''),
    consignee_name: Joi.string().max(200).allow(null, ''),
    consignee_address: Joi.string().max(1000).allow(null, ''),
    pre_carriage_by: Joi.string().max(60).allow(null, ''),
    place_of_receipt: Joi.string().max(150).allow(null, ''),
    vessel_flight_no: Joi.string().max(60).allow(null, ''),
    country_of_origin: Joi.string().max(60).allow(null, ''),
    forwarder_name: Joi.string().max(150).allow(null, ''),
    forwarder_address: Joi.string().max(1000).allow(null, ''),
    vehicle_no: Joi.string().max(60).allow(null, ''),
    driver_cell: Joi.string().max(30).allow(null, ''),
    final_destination: Joi.string().max(150).allow(null, ''),
    marks_and_numbers: Joi.string().max(2000).allow(null, ''),
    total_cartons: Joi.number().integer().min(0).max(999999).allow(null),
    package_kind: Joi.string().max(40).allow(null, ''),
    freight_amount: Joi.number().min(0).max(9999999999.99).allow(null),
    insurance_amount: Joi.number().min(0).max(9999999999.99).allow(null),
    gross_weight: Joi.number().min(0).max(9999999999.999).allow(null),
    net_weight: Joi.number().min(0).max(9999999999.999).allow(null),
    carton_dimensions: Joi.string().max(60).allow(null, ''),
    booking_no: Joi.string().max(60).allow(null, ''),
    bl_no: Joi.string().max(60).allow(null, ''),
    voyage_no: Joi.string().max(60).allow(null, ''),
    transshipment_port: Joi.string().max(150).allow(null, ''),
    notify_party_name: Joi.string().max(200).allow(null, ''),
    notify_party_address: Joi.string().max(1000).allow(null, ''),
    goods_description: Joi.string().max(1000).allow(null, ''),
    total_measurement: Joi.number().min(0).max(9999999999.999).allow(null),
    ex_rate: Joi.string().max(60).allow(null, ''),
    freight_terms: Joi.string().valid('PREPAID', 'COLLECT').allow(null, ''),
    freight_prepaid_at: Joi.string().max(100).allow(null, ''),
    freight_payable_at: Joi.string().max(100).allow(null, ''),
    total_prepaid_in: Joi.string().max(150).allow(null, ''),
    no_of_original_bls: Joi.string().max(40).allow(null, ''),
    bl_place_of_issue: Joi.string().max(100).allow(null, ''),
    bl_date_of_issue: Joi.date().iso().allow(null, ''),

    status: Joi.string().valid('draft', 'in_progress', 'closed').allow(null, ''),
    remarks: Joi.string().allow(null, ''),
    items: Joi.array().items(
      Joi.object({
        id: Joi.number().integer().positive().allow(null),
        order_confirmation_item_id: Joi.number().integer().positive().allow(null),
        design_no: Joi.string().allow(null, ''),
        description: Joi.string().allow(null, ''),
        product_id: Joi.number().integer().positive().allow(null),
        unit: Joi.string().allow(null, ''),
        price: Joi.number().precision(2).min(0).required(),
        qty: Joi.number().integer().min(1).required(),
        remarks: Joi.string().allow(null, ''),
        custom_values: Joi.object().allow(null),
        colours: Joi.array().items(
          Joi.object({
            id: Joi.number().integer().positive().allow(null),
            colour: Joi.string().required(),
            sizes: Joi.array().items(
              Joi.object({
                id: Joi.number().integer().positive().allow(null),
                size: Joi.string().required(),
                qty: Joi.number().integer().min(0).required()
              })
            ).allow(null)
          })
        ).allow(null)
      })
    ).allow(null),
    cartons: Joi.array().items(
      Joi.object({
        id: Joi.number().integer().positive().allow(null),
        carton_no: Joi.string().max(40).required(),
        net_weight: Joi.number().min(0).max(99999999.999).allow(null),
        gross_weight: Joi.number().min(0).max(99999999.999).allow(null),
        dimensions: Joi.string().max(60).allow(null, ''),
        lines: Joi.array().items(
          Joi.object({
            id: Joi.number().integer().positive().allow(null),
            description: Joi.string().max(500).required(),
            unit: Joi.string().max(20).allow(null, ''),
            qty: Joi.number().integer().min(0).max(999999).required()
          })
        ).allow(null)
      })
    ).max(200).allow(null)
  })
};
