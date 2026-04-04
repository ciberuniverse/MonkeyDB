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


function operators_find(one_doc, key_find, value_find) {

    // Si se encuentra la coincidencia directa se retorna true
    if (one_doc[key_find] === value_find) {return true}

    // Si no es un objeto el que se envio es porque no contiene operadores por ende es falso
    if (typeof value_find !== 'object') {return false} 

    // Se obtiene la lista de operadores a trabajar
    let operators_list_find = Object.keys(value_find)
    
    // Se verifica si es mas de uno. En caso de serlo se itera por cada operador enviando los resultados a un array
    if (operators_list_find.length > 1) {
        
        let result_filter = []
        for (let key_operator of operators_list_find) {

            operator_function_execute = operators[key_operator]
            if (!operator_function_execute) {
                return false
            }

            result_filter.push(operator_function_execute(one_doc[key_find], value_find[key_operator]))
        }

        // Cuando se termina la iteracion, se verifica que el array contenga todas las respuestas como true.
        return result_filter.every(x => x === true)

    } 

    // Value find es esto: {"$ne": "ola"}
    let operator = operators_list_find[0] // Esto se transforma en $ne
    let operator_value = value_find[operator] // Esto se transforma en 'ola'

    let operator_in = operators[operator] // Operator in obtiene la funcion almacenada en el diccionario

    // Si no existe un operador valido o no existe una funcion asociada, se retorna falso
    if (!operator || !operator_in) {
        return false
    }
    
    // One doc value es el valor del documento tiene para comparar
    let one_doc_value = one_doc[key_find]
    
    // Se pasan los dos parametros a comparar dependiendo del operador
    return operator_in(one_doc_value, operator_value)

}

module.exports = {
    operators_find
}