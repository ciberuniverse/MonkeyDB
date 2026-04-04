function set(document_object, list_modifications) {

    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        document_object[key_dict_on_document] = list_modifications[key_dict_on_document]
    }

    return document_object

}
function unset(document_object, list_modifications) {

    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        delete document_object[key_dict_on_document]
    }

    return document_object

}

function rename(document_object, list_modifications) {
    let mods_list = Object.keys(list_modifications)


    for (let key_dict_on_document of mods_list) {

        let buff_doc, is_json
        
        // Se intenta copiar el contenido dentro del nombre de la variable
        try {
            buff_doc = JSON.stringify(document_object[key_dict_on_document])
            is_json = true
        }
        catch {
            buff_doc = document_object[key_dict_on_document]
        }

        // Se borra del diccionario original
        delete document_object[key_dict_on_document]

        // Se verifica que la funcion fue marcada como json
        if (is_json === true) {
            buff_doc = JSON.parse(buff_doc)
        }

        // Y se crea un nuevo objeto con el nombre ya cambiado con el mismo contenido
        document_object[list_modifications[key_dict_on_document]] = buff_doc

    }

    return document_object
}

function inc(document_object, list_modifications) {

    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        document_object[key_dict_on_document] += list_modifications[key_dict_on_document]
    }

    return document_object

}

function mul(document_object, list_modifications) {
    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        document_object[key_dict_on_document] = document_object[key_dict_on_document] * list_modifications[key_dict_on_document]
    }

    return document_object
}

function currentDate(document_object, list_modifications) {
    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        document_object[key_dict_on_document] = Date.now()
    }

    return document_object
}

function push_d(document_object, list_modifications) {
    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        
        let list_in_doc = document_object[key_dict_on_document]
        if (!list_in_doc) {
            document_object[key_dict_on_document] = [list_modifications[key_dict_on_document]]
            continue
        }

        document_object[key_dict_on_document].push(list_modifications[key_dict_on_document])

    }

    return document_object
}

function pull_d(document_object, list_modifications) {
    
    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        
        let list_in_doc = document_object[key_dict_on_document]
        if (!list_in_doc) {
            continue
        }

        document_object[key_dict_on_document] = document_object[key_dict_on_document].filter(x => x !== list_modifications[key_dict_on_document])

    }

    return document_object

}

function max(document_object, list_modifications) {
    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {

        if (list_modifications[key_dict_on_document] > document_object[key_dict_on_document]) {
            document_object[key_dict_on_document] = list_modifications[key_dict_on_document] 
        }
    }

    return document_object
}

function min(document_object, list_modifications) {
    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {

        if (list_modifications[key_dict_on_document] < document_object[key_dict_on_document]) {
            document_object[key_dict_on_document] = list_modifications[key_dict_on_document] 
        }
    }

    return document_object
}

function pop_d(document_object, list_modifications) {
    let mods_list = Object.keys(list_modifications)

    for (let key_dict_on_document of mods_list) {
        
        if (!document_object[key_dict_on_document]) {continue}
                
        let idx_max = document_object[key_dict_on_document].length

        // Si la lista solo contiene un elemento, se evita el slice y se retorna directamente vacio
        if (idx_max === 1) {
            document_object[key_dict_on_document] = []
            continue
        }

        // Si se desea borrar unicamente el ultimo valor, se borra xd
        if (list_modifications[key_dict_on_document] === 1) {
            document_object[key_dict_on_document].splice(idx_max - 1)
            continue
        }

        // Splice 0, 1 se usa porque quiero eliminar el indice 0 y especifico unicamente un elemento
        // a eliminar, o splice toma todo el array completo.
        document_object[key_dict_on_document].splice(0, 1)

    }

    return document_object
}

let operators_update_dict = {
    "$set": set,
    "$unset": unset,
    "$rename": rename,
    "$inc": inc,
    "$mul": mul,
    "$max": max,
    "$min": min,
    "$currentDate": currentDate,
    
    "$push": push_d,
    "$pop": pop_d,
    "$pull": pull_d,
}

function operators_update(one_doc, operators_project) {
    
    let operators_updates = Object.keys(operators_project)


    if (operators_updates.length > 1) {

        for (let key_update of operators_updates) {
            let function_execute = operators_update_dict[key_update]

            if (!function_execute) {continue}
            
            one_doc = function_execute(one_doc, operators_project[key_update])
        }

        return one_doc
    }

    let function_execute = operators_update_dict[operators_updates[0]]

    if (!function_execute) {return one_doc}

    one_doc = function_execute(one_doc, operators_project[operators_updates[0]])

    return one_doc

}

module.exports = {
    operators_update
}