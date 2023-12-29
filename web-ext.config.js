/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
require("dotenv").config();

module.exports = {
    build: {
        overwriteDest: true,
    },
	sign: {
		apiKey: process.env.AMO_JWT_ISSUER,
		apiSecret: process.env.AMO_JWT_SECRET,
		useSubmissionApi: false,
		channel: "unlisted",
	},
};
