const monkey_operators = require("./operators.js")
const monkey_operators_update = require("./operators_update.js")

let iters_with_index = ["delete_many", "delete_one", "update_one", "update_many"]
function iter_document_array(object_find, object_project = null, array_document, type_r = "find") {

    let return_doc = []
    let index_list = 0 // Variable que se usara para todo lo que requiera indice de listas

    
    // Se establece el numero de coincidencias desde el objeto a buscar
    let check = Object.values(object_find).length
    


    // Por cada documento encontrado se revisara que cumpla con el filtro enviado
    for (let one_doc of array_document) {
        
        // Contador de coincidencias por usuario
        let passed_check = 0

        // Se setean las variables para usarle dentro del for
        let key, value
        
        for ([key, value] of Object.entries(object_find)) {
            if (monkey_operators.operators_find(one_doc, key, value)) {passed_check += 1}
        }

        /* Seccion unicamente para resultados unicos que no requieren mayor iteracion */
        // Se usan else if al ser mas rapidos
        if (type_r === "delete_one" && passed_check === check) {
            return index_list
        }

        // Se retorna la primera coincidencia con la proyeccion si es que se esta pidiendo uno solo
        else if (type_r === "find_one" && passed_check === check) {
            return project(one_doc, object_project)
        }

        else if (type_r === "update_one" && passed_check === check) {
            return [monkey_operators_update.operators_update(one_doc, object_project), index_list]
        }

        /* ===================================================================== */

        /* Seccion operacion listado 
        
        Todo lo que esta aqui debajo hasta lo limitado son las operaciones que requieren de una iteracion
        completa del documento. Tales como find, delete_many
        
        */

        // Si se cumple con el filtro se agrega a la lista y se continua
        else if (type_r === "find" && passed_check === check) {
            return_doc.push(project(one_doc, object_project))
            continue
        }

        // Zonas que requieren indices
        else if (type_r === "delete_many" && passed_check === check) {
            return_doc.push(index_list)
        }

        else if (type_r === "update_many" && passed_check === check) {
            return_doc.push([monkey_operators_update.operators_update(one_doc, object_project), index_list])
        }

        if (iters_with_index.includes(type_r)) {index_list += 1}
        
    }

    // Se retornan todos los documentos en la lista
    return return_doc

}

function project(object_return, object_project = null) {
    
    // Si es que no se trae ninguna proyeccion se retorna el objeto intacto
    if (object_project === null) {return object_return}

    let key, value
    for ([key, value] of Object.entries(object_project)) {

        // Si se le asigno un false o un 0 se elimina esa key del object
        if (!value) {
            delete object_return[key]
        }

    }

    // Se retorna el nuevo object
    return object_return
}

module.exports = {
    iter_document_array
}