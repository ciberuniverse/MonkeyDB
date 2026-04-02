const crypto = require("crypto")

function monkey_db_return(acknowledged, _id = null, insertedCount = null, insertedIds = null) {
    
    let return_vars = {
        "acknowledged": acknowledged,
        "_id": _id,
        "insertedCount": insertedCount
    }
    
    // Se itera cada clave valor de el diccionario y se eliminan los vacios
    let key, value
    for ([key, value] of Object.entries(return_vars)) {
        if (value === null) {
            delete return_vars[key]
        }
    }

    return return_vars
}

function normalize_url(url = "") {
    if (url.endsWith("/")) {return url.slice(0, -1)}
    return url
}

function gen_uuid() {
    let uuid = String(Date.now())
    return crypto.createHash("md5").update(uuid).digest("hex")
}

module.exports = {
    monkey_db_return, normalize_url, gen_uuid
}