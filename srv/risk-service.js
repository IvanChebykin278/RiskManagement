// Imports
const cds = require("@sap/cds");
/**
* The service implementation with all service handlers
*/
module.exports = cds.service.impl(async function () {
    const { Risks, BusinessPartners } = this.entities;
    const BPsrv = await cds.connect.to("API_BUSINESS_PARTNER");

    this.after("READ", Risks, (data) => {
        const risks = Array.isArray(data) ? data : [data];
        risks.forEach((risk) => {
            if (risk.impact >= 100000) {
                risk.criticality = 1;
            } else {
                risk.criticality = 2;
            }
        });
    });

    this.on("READ", BusinessPartners, async (req) => {

        req.query.where("LastName <> '' and FirstName <> '' ");

        return await BPsrv.transaction(req).send({
            query: req.query,
            headers: {
                apikey: process.env.apikey,
            },
        });
    });

    this.on("READ", Risks, async (req, next) => {

        const expandIndex = req.query.SELECT.columns.findIndex(
            ({ expand, ref }) => expand && ref[0] === "bp"
        );
        const isBpExpaneded = req.query.SELECT.columns.find((column) =>
            column.ref.find((ref) => ref == "bp_BusinessPartner")
        );

        if (expandIndex < 0) return next();

        req.query.SELECT.columns.splice(expandIndex, 1);

        if (!isBpExpaneded) {
            req.query.SELECT.columns.push({ ref: ["bp_BusinessPartner"] });
        }

        try {
            const res = await next();
            await Promise.all(
                res.map(async (risk) => {
                    const bp = await BPsrv.transaction(req).send({
                        query: SELECT.one(this.entities.BusinessPartners)
                            .where({ BusinessPartner: risk.bp_BusinessPartner })
                            .columns(["BusinessPartner", "LastName", "FirstName"]),
                        headers: {
                            apikey: process.env.apikey,
                        },
                    });
                    risk.bp = bp;
                })
            );
        } catch (error) { }
    });

});
