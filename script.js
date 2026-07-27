const fileInput = document.getElementById("kmlFile");
const convertBtn = document.getElementById("convertBtn");
const output = document.getElementById("output");

const colorPicker = document.getElementById("polygonColor");
const colorValue = document.getElementById("colorValue");

colorPicker.addEventListener("input", () => {
    colorValue.textContent = colorPicker.value;
});

convertBtn.addEventListener("click", convertKML);

async function convertKML() {

    const file = fileInput.files[0];
    const geofenceName = file.name.replace(/\.[^/.]+$/, "");

    if (!file) {
        alert("Please choose a KML file.");
        return;
    }

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

    output.textContent = JSON.stringify(result, null, 4);

    downloadGexp(result, geofenceName);

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