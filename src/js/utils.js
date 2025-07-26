function cleanJson(text) {
    return text
        .replace(/```json\n?|\n?```/g, "")
        .replace(/`+/g, "")
        .trim();
}

function capitalizeFirstWord(text) {
    return text ? text.replace(/^\w/, c => c.toUpperCase()) : text;
}

function escapeSpecialChars(text) {
    return text.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}