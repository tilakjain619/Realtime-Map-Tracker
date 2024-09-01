document.addEventListener("DOMContentLoaded", () => {
    // Initialize the socket
    const socket = io();

    // Initialize the map
    const map = L.map("map").setView([0, 0], 16);

    // Add tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tilak',
        maxZoom: 18
    }).addTo(map);

    // Initialize the routing control for the main route
    const routingControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true,
        createMarker: function() { return null; }, // Disable default markers
        lineOptions: {
            styles: [{ color: '#ff6600', weight: 4 }] // Main route color
        }
    }).addTo(map);

    // Initialize the routing control for alternate routes
    const alternateRoutesControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true,
        createMarker: function() { return null; }, // Disable default markers
        lineOptions: {
            styles: [{ color: '#d3d3d3', weight: 3 }] // Alternate route color
        },
        showAlternatives: true // Show alternative routes
    }).addTo(map);

    // Add the geocoder control
    L.Control.geocoder({
        defaultMarkGeocode: false  // Prevent adding a marker by default
    }).on('markgeocode', function (e) {
        const latlng = e.geocode.center;

        // Create a custom marker icon
        const customIcon = L.icon({
            iconUrl: 'https://img.icons8.com/?size=100&id=13800&format=png&color=000000', // URL to your custom icon
            iconSize: [25, 31], // size of the icon
            iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
            popupAnchor: [1, -34], // point from which the popup should open relative to the iconAnchor
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', // optional shadow image
            shadowSize: [41, 41] // size of the shadow
        });

        map.setView(latlng, 16); // Set the map view to the searched location

        // Add a marker with the custom icon at the searched location
        L.marker(latlng, { icon: customIcon })
            .addTo(map)
            .bindPopup(e.geocode.name).openPopup();

        if (currentLocationMarker) {
            // Set waypoints for the main route
            routingControl.setWaypoints([
                L.latLng(currentLocationMarker.getLatLng()), // Current location
                latlng // Searched location
            ]);

            // Set waypoints for alternate routes
            alternateRoutesControl.setWaypoints([
                L.latLng(currentLocationMarker.getLatLng()), // Current location
                latlng // Searched location
            ]);

            // Show the distance for the main route
            routingControl.on('routesfound', function(e) {
                const distance = e.routes[0].summary.totalDistance / 1000;
                console.log(`Distance: ${distance.toFixed(2)} km`);
            });
        } else {
            alert("Current location not available.");
        }
    }).addTo(map);

    let currentLocationMarker;

    // Handle geolocation and socket events
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { latitude, longitude });

            if (!currentLocationMarker) {
                currentLocationMarker = L.marker([latitude, longitude], {
                    opacity: 0.7,
                    riseOnHover: true
                }).addTo(map).bindPopup("You are here").openPopup();
            } else {
                currentLocationMarker.setLatLng([latitude, longitude]);
            }
        }, (error) => {
            console.log(error);
        }, {
            enableHighAccuracy: true,
            timeout: 1000,
            maximumAge: 0
        });
    }

    const markers = {};

    socket.on("receive-location", (data) => {
        const { id, latitude, longitude } = data;
        map.setView([latitude, longitude]);
        if (markers[id]) {
            markers[id].setLatLng([latitude, longitude]);
        } else {
            markers[id] = L.marker([latitude, longitude], {
                opacity: 0.7,
                riseOnHover: true
            }).addTo(map);
        }
    });

    socket.on("user-disconnected", (id) => {
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });

    // Button to go to current location
    document.getElementById("my-location-btn").addEventListener("click", function() {
        if (currentLocationMarker) {
            map.setView(currentLocationMarker.getLatLng(), 16); // Center map on current location marker
            currentLocationMarker.openPopup();
        } else {
            console.error("Current location not yet available.");
        }
    });
});
