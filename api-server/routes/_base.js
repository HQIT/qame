const ok = (res, data, message = 'OK') => {
  return res.status(200).json({ code: 200, message, data });
}
const badRequest = (res, message = 'Bad request') => {
  return res.status(400).json({ code: 400, message, data: null });
}
const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({ code: 403, message, data: null });
}
const notFound = (res, message = 'Not found') => {
  return res.status(404).json({ code: 404, message, data: null });
}
const serverError = (res, message = 'Server error') => {
  return res.status(500).json({ code: 500, message, data: null });
}

module.exports = {
  ok,
  badRequest,
  forbidden,
  notFound,
  serverError
};