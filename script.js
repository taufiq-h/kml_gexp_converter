const fileInput = document.getElementById("kmlFile");
const convertBtn = document.getElementById("convertBtn");
const output = document.getElementById("output");

const colorPicker = document.getElementById("polygonColor");
const colorValue = document.getElementById("colorValue");

const groupFileInput = document.getElementById("groupFiles");
const convertGroupBtn = document.getElementById("convertGroupBtn");

const groupColorPicker = document.getElementById("groupPolygonColor");
const groupColorValue = document.getElementById("groupColorValue");

const downloadBtn = document.getElementById("downloadBtn");

let currentJson = null;
let currentFileName = "";

colorPicker.addEventListener("input", () => {
    colorValue.textContent = colorPicker.value;
});

convertBtn.addEventListener("click", convertKML);

groupColorPicker.addEventListener("input", () => {
    groupColorValue.textContent = groupColorPicker.value;
});

convertGroupBtn.addEventListener("click", convertGroup);

async function convertKML() {

    const file = fileInput.files[0];

    if (!file) {
        alert("Please choose a KML file.");
        return;
    }

    const geofenceName =
        file.name.replace(/\.[^/.]+$/, "");

    const text = await file.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    const placemarks = xml.getElementsByTagName("Placemark");

    if (placemarks.length === 0) {
        alert("No Placemark found.");
        return;
    }

    const groupName = document.getElementById("groupName").value;
    // const groupId = Number(document.getElementById("groupId").value);
    const groupId = 1;
    const polygonColor = colorPicker.value;

    const result = {
        groups: [
            {
                id: groupId,
                title: groupName
            }
        ],
        geofences: []
    };

    let geofenceId = 1;

    for (const placemark of placemarks) {

        const geofence = parsePlacemark(
            placemark,
            geofenceId++,
            groupId,
            polygonColor,
            geofenceName
        );

        if (geofence)
            result.geofences.push(geofence);

    }

    currentJson = result;

    currentFileName = geofenceName;

    output.value = JSON.stringify(result, null, 4);

    output.readOnly = true;
    editBtn.textContent = "Edit JSON";

    downloadBtn.disabled = false;

}


async function convertGroup() {

    const files = [...groupFileInput.files];

    if (files.length === 0) {
        alert("Please choose one or more KML files.");
        return;
    }

    const groupTitle = document.getElementById("groupTitle").value.trim();

    if (!groupTitle) {
        alert("Please enter a Group Title.");
        return;
    }

    const polygonColor = groupColorPicker.value;

    const result = {

        groups: [
            {
                id: 1,
                title: groupTitle
            }
        ],

        geofences: []

    };

    let geofenceId = 1;

    for (const file of files) {

        const text = await file.text();

        const parser = new DOMParser();

        const xml = parser.parseFromString(text, "text/xml");

        const placemarks = xml.getElementsByTagName("Placemark");

        const geofenceName =
            file.name.replace(/\.kml$/i, "");

        for (const placemark of placemarks) {

            const geofence = parsePlacemark(

                placemark,

                geofenceId++,

                1,

                polygonColor,

                geofenceName

            );

            if (geofence)
                result.geofences.push(geofence);

        }

    }

    currentJson = result;

    currentFileName = groupTitle;

    output.value = JSON.stringify(result, null, 4);

    output.readOnly = true;
    editBtn.textContent = "Edit JSON";

    downloadBtn.disabled = false;

}

function parsePlacemark(
    placemark,
    id,
    groupId,
    polygonColor,
    geofenceName
) {

    // const name =
    //     placemark.getElementsByTagName("description")[0]?.textContent ||
    //     placemark.getElementsByTagName("name")[0]?.textContent ||
    //     `Polygon ${id}`;
    const name = geofenceName;

    const coordinateNode =
        placemark.getElementsByTagName("coordinates")[0];

    if (!coordinateNode)
        return null;

    const coordinateText =
        coordinateNode.textContent.trim();

    const coordinates =
        parseCoordinates(coordinateText);

    return {

        id,

        group_id: groupId,

        name,

        coordinates: JSON.stringify(coordinates),

        polygon_color: polygonColor,

        type: "polygon",

        radius: null,

        center: null,

        device_id: null

    };

}

function parseCoordinates(text) {

    const lines = text.trim().split(/\s+/);

    const points = [];

    for (const line of lines) {

        const [lng, lat] = line.split(",");

        points.push({

            lat: Number(lat),

            lng: Number(lng)

        });

    }

    return points;

}

downloadBtn.addEventListener("click", () => {

    try {

        const json = JSON.parse(output.value);

        let fileName;

        if (json.geofences.length === 1) {

            // Single KML
            fileName = json.geofences[0].name;

        } else {

            // Group KML
            fileName = json.groups[0].title;

        }

        downloadGexp(json, fileName);

    } catch {

        alert("Invalid JSON.\nPlease fix the JSON before downloading.");

    }

});

function downloadGexp(json, fileName) {

    const blob = new Blob(

        [JSON.stringify(json, null, 4)],

        {
            type: "application/json"
        }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `${fileName}.gexp`;

    a.click();

    URL.revokeObjectURL(url);

}

const editBtn = document.getElementById("editBtn");

editBtn.addEventListener("click",()=>{

    output.readOnly = !output.readOnly;

    editBtn.textContent =
        output.readOnly ? "Edit JSON" : "Lock JSON";

});