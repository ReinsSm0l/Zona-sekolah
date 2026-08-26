const schoolType = document.getElementById("schoolType");
const smpOption = document.getElementById("smpOption");
const coordinateInput = document.getElementById("coordinateInput");
const searchButton = document.getElementById("searchButton");
const errorMessage = document.getElementById("errorMessage");
const resultsSection = document.getElementById("resultsSection");
const schoolList = document.getElementById("schoolList");
const resultCount = document.getElementById("resultCount");

let schoolData = {
    SMA: [],
    SMP: []
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {

        const response = await fetch("data.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(
                "data.json tidak dapat dibaca."
            );
        }
        schoolData = await response.json();

        const hasSMP = Array.isArray(schoolData.SMP) && schoolData.SMP.length > 0;
        smpOption.disabled = !hasSMP;

        if (!hasSMP && schoolType.value === "SMP") {
            schoolType.value = "SMA";
        }

    } catch (error) {

        showError("Gagal memuat data sekolah. Pastikan data.json berada di folder yang sama.");
        console.error(error);

    }
}

searchButton.addEventListener("click", searchSchools);

coordinateInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchSchools();
    }
}
);

function searchSchools() {
    clearError();

    const coordinate = parseCoordinate(coordinateInput.value);

    if (!coordinate) {
        showError("Koordinat tidak valid. Gunakan format: latitude, longitude");
        return;
    }

    const selectedType = schoolType.value;

    const schools = Array.isArray(schoolData[selectedType]) ? schoolData[selectedType] : [];

    if (schools.length === 0) {
        showError(`Data ${selectedType} Sederajat belum tersedia.`);
        return;
    }

    const rankedSchools = schools.map((school) => {
        const distanceKm = haversine(coordinate.lat, coordinate.lng, Number(school.lat), Number(school.lng));
        return { ...school, distanceKm };
    }
    )

        .filter((school) => Number.isFinite(school.distanceKm))

        .sort((a, b) => a.distanceKm - b.distanceKm);

    renderSchools(rankedSchools);
}

function parseCoordinate(value) {

    const matches = value.match(/-?\d+(?:[.,]\d+)?/g);

    if (!matches || matches.length < 2) {
        return null;
    }

    const lat = Number(matches[0].replace(",", "."));
    const lng = Number(matches[1].replace(",", "."));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    if (lat < -90 || lat > 90) {
        return null;
    }

    if (lng < -180 || lng > 180) {
        return null;
    }

    return { lat, lng };

}

function haversine(lat1, lng1, lat2, lng2) {

    const earthRadiusKm = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

    return (earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

}

function toRadians(degrees) {

    return (degrees * Math.PI / 180);

}

function getStatus(distanceKm) {

    const distanceMeters = distanceKm * 1000;

    if (distanceMeters <= 500) {

        return {
            className: "green",
            label: "Zona dekat"
        };

    }

    if (distanceMeters <= 1000) {

        return {
            className: "yellow",
            label: "Zona menengah"
        };

    }

    return {
        className: "red",
        label: "Di luar zona dekat"
    };

}

function formatDistance(distanceKm) {

    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(2)} km`;

}

function renderSchools(schools) {

    schoolList.innerHTML = "";
    resultCount.textContent = `${schools.length} sekolah ditemukan`;

    if (schools.length === 0) {
        schoolList.innerHTML = `
            <div class="empty-state">
                Tidak ada sekolah
                dengan koordinat yang valid.
            </div>
        `;
    }

    else {
        schools.forEach((school) => { schoolList.appendChild(createSchoolCard(school)); });
    }

    resultsSection.classList.remove("hidden");

    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}

function createSchoolCard(school) {

    const article = document.createElement("article");
    article.className = "school-card";

    const status = getStatus(school.distanceKm);

    const photo = document.createElement("div");
    photo.className = "school-photo";

    const lamp = document.createElement("span");
    lamp.className = `status-lamp ${status.className}`;
    lamp.title = status.label;

    photo.appendChild(lamp);

    if (school.foto && String(school.foto).trim()) {

        const img = document.createElement("img");
        img.src = school.foto;
        img.alt = `Foto ${school.nama}`;
        img.loading = "lazy";

        img.onerror = () => {
            img.remove();
            addPhotoFallback(photo, school.nama);
        };

        photo.appendChild(img);

    }

    else {
        addPhotoFallback(photo, school.nama);
    }

    const info = document.createElement("div");
    info.className = "school-info";

    const name = document.createElement("h3");
    name.className = "school-name";
    name.textContent = school.nama;

    const district = document.createElement("p");
    district.className = "school-district";
    district.textContent = school.kecamatan ? `Kecamatan ${school.kecamatan}` : "Kecamatan belum tersedia";

    const distance = document.createElement("p");
    distance.className = "distance";
    distance.textContent = `${formatDistance(school.distanceKm)} dari rumah`;

    const actions = document.createElement("div");
    actions.className = "school-actions";

    const link = document.createElement("a");
    link.className = "view-school";
    link.href = buildGoogleMapsUrl(school);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Lihat sekolah ↗";

    actions.appendChild(link);

    info.append(
        name,
        district,
        distance,
        actions
    );

    article.append(
        photo,
        info
    );

    return article;

}

function addPhotoFallback(container, schoolName) {

    const fallback = document.createElement("div");
    fallback.className = "photo-fallback";
    fallback.textContent = schoolName;

    container.appendChild(fallback);

}

function buildGoogleMapsUrl(school) {

    if (school.gmaps && String(school.gmaps).trim()) {
        return school.gmaps;
    }

    const query = encodeURIComponent(`${school.nama}, ${school.kecamatan || ""}`);

    return (
        "https://www.google.com/maps/search/" +
        `?api=1&query=${query}`
    );

}

function showError(message) {
    errorMessage.textContent = message;
}

function clearError() {
    errorMessage.textContent = "";
}