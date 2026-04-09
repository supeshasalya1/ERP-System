const pad2 = (value) => String(value).padStart(2, "0");

const getLocalDateString = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const getLocalTimestamp = (date = new Date()) =>
  `${getLocalDateString(date)} ${pad2(date.getHours())}:${pad2(
    date.getMinutes()
  )}:${pad2(date.getSeconds())}`;

module.exports = { getLocalDateString, getLocalTimestamp };
