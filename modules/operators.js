function eq(one_doc_value, value_find) {return one_doc_value === value_find}
function ne(one_doc_value, value_find) {return one_doc_value !== value_find}
function gt(one_doc_value, value_find) {return one_doc_value > value_find}
function gte(one_doc_value, value_find) {return one_doc_value >= value_find}
function lt(one_doc_value, value_find) {return one_doc_value < value_find}
function lte(one_doc_value, value_find) {return one_doc_value <= value_find}
function in_d(one_doc_value, value_find) {return value_find.includes(one_doc_value)}
function nin_d(one_doc_value, value_find) {return !value_find.includes(one_doc_value)}

let operators = {
    "$eq": eq,
    "$ne": ne,
    "$gt": gt,
    "$gte": gte,
    "$lt": lt,
    "$lte": lte,
    "$in": in_d,
    "$nin": nin_d
}


module.exports = {eq, ne, gt, gte, lt, lte, in_d, nin_d, operators}