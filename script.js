// ========================================
// DOM ELEMENTS
// ========================================

const fileInput = document.getElementById("kmlFile");
const convertBtn = document.getElementById("convertBtn");

const output = document.getElementById("output");

const colorPicker = document.getElementById("polygonColor");
const colorValue = document.getElementById("colorValue");

const groupFileInput = document.getElementById("groupFiles");
const convertGroupBtn = document.getElementById("convertGroupBtn");

const groupColorPicker =
    document.getElementById("groupPolygonColor");

const groupColorValue =
    document.getElementById("groupColorValue");

const downloadBtn =
    document.getElementById("downloadBtn");

const editBtn =
    document.getElementById("editBtn");


// ========================================
// CURRENT STATE
// ========================================

let currentJson = null;
let currentFileName = "";
let currentMode = "";


// ========================================
// COLOR PICKER
// ========================================

colorPicker.addEventListener("input", () => {

    colorValue.textContent =
        colorPicker.value;

});

groupColorPicker.addEventListener("input", () => {

    groupColorValue.textContent =
        groupColorPicker.value;

});


// ========================================
// BUTTON EVENTS
// ========================================

convertBtn.addEventListener(
    "click",
    convertKML
);

convertGroupBtn.addEventListener(
    "click",
    convertGroup
);

downloadBtn.addEventListener(
    "click",
    downloadCurrentGexp
);

editBtn.addEventListener(
    "click",
    toggleEditor
);


// ========================================
// SINGLE KML CONVERTER
// ========================================

async function convertKML() {

    const file = fileInput.files[0];

    // Check file
    if (!file) {

        alert("Please choose a KML file.");

        return;

    }


    // Get filename without extension
    const geofenceName =
        file.name.replace(/\.[^/.]+$/, "");


    // Read KML
    const text =
        await file.text();


    // Parse XML
    const parser =
        new DOMParser();

    const xml =
        parser.parseFromString(
            text,
            "text/xml"
        );


    // Check XML parsing error
    const parserError =
        xml.getElementsByTagName(
            "parsererror"
        );

    if (parserError.length > 0) {

        alert(
            "Invalid KML file."
        );

        return;

    }


    // Get all Placemark elements
    const placemarks =
        xml.getElementsByTagName(
            "Placemark"
        );


    if (placemarks.length === 0) {

        alert(
            "No Placemark found."
        );

        return;

    }


    // Group information
    const groupName =
        document
            .getElementById("groupName")
            .value
            .trim();


    const groupId = 1;

    const polygonColor =
        colorPicker.value;


    // Create result
    const result = {

        groups: [

            {
                id: groupId,
                title: groupName
            }

        ],

        geofences: []

    };


    // Geofence ID
    let geofenceId = 1;


    // ========================================
    // PROCESS EVERY PLACEMARK
    // ========================================

    for (const placemark of placemarks) {

        const geofences =
            parsePlacemark(

                placemark,

                geofenceId,

                groupId,

                polygonColor,

                geofenceName

            );


        // Add every polygon
        for (const geofence of geofences) {

            result.geofences.push(
                geofence
            );

            geofenceId++;

        }

    }


    // Check result
    if (result.geofences.length === 0) {

        alert(
            "No polygon found in the KML file."
        );

        return;

    }


    // ========================================
    // SAVE CURRENT STATE
    // ========================================

    currentJson = result;

    currentFileName = geofenceName;

    currentMode = "single";


    // ========================================
    // SHOW PREVIEW
    // ========================================

    output.value =
        JSON.stringify(
            result,
            null,
            4
        );


    // Lock JSON after conversion
    output.readOnly = true;

    editBtn.textContent =
        "Edit JSON";

    downloadBtn.disabled =
        false;

}


// ========================================
// GROUP KML CONVERTER
// ========================================

async function convertGroup() {

    const files =
        [...groupFileInput.files];


    // Check files
    if (files.length === 0) {

        alert(
            "Please choose one or more KML files."
        );

        return;

    }


    // Get group title
    const groupTitle =
        document
            .getElementById("groupTitle")
            .value
            .trim();


    if (!groupTitle) {

        alert(
            "Please enter a Group Title."
        );

        return;

    }


    const groupId = 1;

    const polygonColor =
        groupColorPicker.value;


    // ========================================
    // CREATE RESULT
    // ========================================

    const result = {

        groups: [

            {
                id: groupId,
                title: groupTitle
            }

        ],

        geofences: []

    };


    let geofenceId = 1;


    // ========================================
    // PROCESS EVERY KML FILE
    // ========================================

    for (const file of files) {

        // Read KML
        const text =
            await file.text();


        // Parse XML
        const parser =
            new DOMParser();

        const xml =
            parser.parseFromString(
                text,
                "text/xml"
            );


        // Check XML parsing error
        const parserError =
            xml.getElementsByTagName(
                "parsererror"
            );

        if (parserError.length > 0) {

            alert(
                `Invalid KML file: ${file.name}`
            );

            continue;

        }


        // Get Placemarks
        const placemarks =
            xml.getElementsByTagName(
                "Placemark"
            );


        if (placemarks.length === 0) {

            console.warn(
                `No Placemark found in ${file.name}`
            );

            continue;

        }


        // Filename becomes geofence name
        const geofenceName =
            file.name.replace(
                /\.kml$/i,
                ""
            );


        // ========================================
        // PROCESS EVERY PLACEMARK
        // ========================================

        for (const placemark of placemarks) {

            const geofences =
                parsePlacemark(

                    placemark,

                    geofenceId,

                    groupId,

                    polygonColor,

                    geofenceName

                );


            // Add every polygon
            for (const geofence of geofences) {

                result.geofences.push(
                    geofence
                );

                geofenceId++;

            }

        }

    }


    // ========================================
    // CHECK RESULT
    // ========================================

    if (result.geofences.length === 0) {

        alert(
            "No polygon found in the selected KML files."
        );

        return;

    }


    // ========================================
    // SAVE CURRENT STATE
    // ========================================

    currentJson = result;

    currentFileName = groupTitle;

    currentMode = "group";


    // ========================================
    // SHOW PREVIEW
    // ========================================

    output.value =
        JSON.stringify(
            result,
            null,
            4
        );


    // Lock JSON after conversion
    output.readOnly = true;

    editBtn.textContent =
        "Edit JSON";

    downloadBtn.disabled =
        false;

}


// ========================================
// PARSE PLACEMARK
// ========================================
//
// One Placemark can contain:
// - One Polygon
// - Multiple Polygons
// - MultiGeometry
//
// Every Polygon becomes one geofence.
// ========================================

function parsePlacemark(
    placemark,
    startId,
    groupId,
    polygonColor,
    geofenceName
) {

    const polygons =
        placemark.getElementsByTagName(
            "Polygon"
        );


    if (polygons.length === 0) {

        return [];

    }


    const geofences = [];


    // ========================================
    // PROCESS EVERY POLYGON
    // ========================================

    for (
        let i = 0;
        i < polygons.length;
        i++
    ) {

        const polygon =
            polygons[i];


        // Get coordinates
        const coordinateNode =
            polygon.getElementsByTagName(
                "coordinates"
            )[0];


        if (!coordinateNode) {

            continue;

        }


        const coordinateText =
            coordinateNode.textContent.trim();


        if (!coordinateText) {

            continue;

        }


        // Parse coordinates
        const coordinates =
            parseCoordinates(
                coordinateText
            );


        if (coordinates.length === 0) {

            continue;

        }


        // ========================================
        // NAME
        // ========================================
        //
        // One polygon:
        // Kab_Kota_SUMENEP
        //
        // Multiple polygons:
        // Kab_Kota_SUMENEP_1
        // Kab_Kota_SUMENEP_2
        // Kab_Kota_SUMENEP_3
        // ========================================

        let name;

        if (polygons.length === 1) {

            name = geofenceName;

        } else {

            name =
                `${geofenceName}_${i + 1}`;

        }


        // ========================================
        // CREATE GEOFENCE
        // ========================================

        geofences.push({

            id: startId + geofences.length,

            group_id: groupId,

            name: name,

            coordinates:
                JSON.stringify(
                    coordinates
                ),

            polygon_color:
                polygonColor,

            type: "polygon",

            radius: null,

            center: null,

            device_id: null

        });

    }


    return geofences;

}


// ========================================
// PARSE COORDINATES
// ========================================
//
// KML:
// longitude,latitude,altitude
//
// GEXP:
// {
//     lat: latitude,
//     lng: longitude
// }
// ========================================

function parseCoordinates(text) {

    const lines =
        text
            .trim()
            .split(/\s+/);


    const points = [];


    for (const line of lines) {

        const parts =
            line.split(",");


        if (parts.length < 2) {

            continue;

        }


        const lng =
            Number(parts[0]);

        const lat =
            Number(parts[1]);


        // Ignore invalid coordinates
        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng)
        ) {

            continue;

        }


        points.push({

            lat: lat,

            lng: lng

        });

    }


    return points;

}


// ========================================
// DOWNLOAD
// ========================================

function downloadCurrentGexp() {

    try {

        // Read JSON from preview
        const json =
            JSON.parse(
                output.value
            );


        let fileName;


        // ========================================
        // SINGLE MODE
        // ========================================

        if (currentMode === "single") {

            if (
                !json.geofences ||
                json.geofences.length === 0
            ) {

                alert(
                    "No geofence found."
                );

                return;

            }


            // Follow edited geofence name
            fileName =
                json.geofences[0].name;

        }


        // ========================================
        // GROUP MODE
        // ========================================

        else if (currentMode === "group") {

            if (
                !json.groups ||
                json.groups.length === 0
            ) {

                alert(
                    "No group found."
                );

                return;

            }


            // Follow edited group title
            fileName =
                json.groups[0].title;

        }


        else {

            alert(
                "Please convert a KML file first."
            );

            return;

        }


        // Check filename
        if (!fileName || !fileName.trim()) {

            alert(
                "Filename cannot be empty."
            );

            return;

        }


        // Download
        downloadGexp(
            json,
            fileName.trim()
        );

    }

    catch (error) {

        alert(
            "Invalid JSON.\n\n" +
            "Please fix the JSON before downloading."
        );

    }

}


// ========================================
// CREATE GEXP DOWNLOAD
// ========================================

function downloadGexp(
    json,
    fileName
) {

    const blob =
        new Blob(

            [
                JSON.stringify(
                    json,
                    null,
                    4
                )
            ],

            {
                type: "application/json"
            }

        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            "a"
        );


    a.href = url;

    a.download =
        `${fileName}.gexp`;


    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);


    URL.revokeObjectURL(
        url
    );

}


// ========================================
// EDIT / LOCK JSON
// ========================================

function toggleEditor() {

    output.readOnly =
        !output.readOnly;


    if (output.readOnly) {

        editBtn.textContent =
            "Edit JSON";

    } else {

        editBtn.textContent =
            "Lock JSON";

    }

}