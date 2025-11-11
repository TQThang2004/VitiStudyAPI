export const success = (res, data, message = "Success") => {
  return res.status(200).json({ success: true, message, data });
};

export const error = (res, message, status = 400) => {
  return res.status(status).json({ success: false, message });
};
