const CATEGORIES = {
    entries: {
        key: "entries",
        label: "Entries",
        color: "#dfe6e9",
        supportsTags: false,
        supportsFavorite: false,
        fields: [
            { name: "text", label: "Text", type: "textarea" }
        ]
    },
    essences: {
        key: "essences",
        label: "Essences",
        color: "#a29bfe",
        supportsTags: true,
        supportsFavorite: true,
        fields: [
            { name: "title", label: "Title", type: "text" },
            { name: "type", label: "Type", type: "text" },
            { name: "effect", label: "Effect", type: "text" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "tags", label: "Tags (comma separated)", type: "tags" }
        ]
    },
    items: {
        key: "items",
        label: "Items",
        color: "#55efc4",
        supportsTags: true,
        supportsFavorite: true,
        fields: [
            { name: "name", label: "Name", type: "text" },
            { name: "rarity", label: "Rarity", type: "text" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "tags", label: "Tags (comma separated)", type: "tags" }
        ]
    },
    traits: {
        key: "traits",
        label: "Traits",
        color: "#fab1a0",
        supportsTags: true,
        supportsFavorite: true,
        fields: [
            { name: "name", label: "Name", type: "text" },
            { name: "effect", label: "Effect", type: "text" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "tags", label: "Tags (comma separated)", type: "tags" }
        ]
    },
    mutations: {
        key: "mutations",
        label: "Mutations",
        color: "#ff7675",
        supportsTags: true,
        supportsFavorite: true,
        fields: [
            { name: "name", label: "Name", type: "text" },
            { name: "mutationType", label: "Mutation Type", type: "text" },
            { name: "effect", label: "Effect", type: "text" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "tags", label: "Tags (comma separated)", type: "tags" }
        ]
    }
};
