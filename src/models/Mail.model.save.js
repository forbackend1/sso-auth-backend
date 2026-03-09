const Mail = require("./mail.schema.js");

async function saveMail(mailData) {
  return Mail.create(mailData);
}

module.exports = { saveMail };