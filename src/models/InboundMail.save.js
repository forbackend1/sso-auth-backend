const InboundMail = require("./inboundMail.schema");

async function saveInboundMail(mailData) {
  return InboundMail.create(mailData);
}

module.exports = { saveInboundMail };