export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      acc[curr.path[0]] = [curr.message];
      return acc;
    }, {});
    return res.status(422).json({ message: 'The given data was invalid.', errors });
  }
  req.body = value;
  next();
};
