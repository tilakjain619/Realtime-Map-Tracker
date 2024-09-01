document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");

    // Initialize the socket
    const socket = io();

    // Initialize the map
    const map = L.map("map", {
        center: [0, 0],
        zoom: 16
    });

    // Base map tile layers for normal and satellite views
    const normalLayer = L.tileLayer('https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?style=explore.day&apiKey=FsTaBI0IcCi5PXDF9rXsbFohaO_uJ435fwN5iMAoqSg', {
        attribution: '© HERE',
        maxZoom: 18
    }).addTo(map);

    const satelliteLayer = L.tileLayer('https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?style=satellite.day&apiKey=FsTaBI0IcCi5PXDF9rXsbFohaO_uJ435fwN5iMAoqSg', {
        attribution: '© HERE',
        maxZoom: 18
    });

    let currentLayer = normalLayer;

    // Initialize the routing control for the main route
    const routingControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true,
        createMarker: function() { return null; },
        lineOptions: {
            styles: [{ color: '#ff6600', weight: 4 }]
        }
    }).addTo(map);

    // Initialize the routing control for alternate routes
    const alternateRoutesControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true,
        createMarker: function() { return null; },
        lineOptions: {
            styles: [{ color: '#d3d3d3', weight: 3 }]
        },
        showAlternatives: true
    }).addTo(map);

    // Add the geocoder control
    L.Control.geocoder({
        defaultMarkGeocode: false
    }).on('markgeocode', function (e) {
        const latlng = e.geocode.center;

        // Create a custom marker icon
        const customIcon = L.icon({
            iconUrl: 'https://img.icons8.com/?size=100&id=13800&format=png&color=000000',
            iconSize: [25, 31],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            shadowSize: [41, 41]
        });

        map.setView(latlng, 16);

        L.marker(latlng, { icon: customIcon })
            .addTo(map)
            .bindPopup(e.geocode.name).openPopup();

        if (currentLocationMarker) {
            routingControl.setWaypoints([
                L.latLng(currentLocationMarker.getLatLng()),
                latlng
            ]);

            alternateRoutesControl.setWaypoints([
                L.latLng(currentLocationMarker.getLatLng()),
                latlng
            ]);

            routingControl.on('routesfound', function(e) {
                const distance = e.routes[0].summary.totalDistance / 1000;
                console.log(`Distance: ${distance.toFixed(2)} km`);
            });
        } else {
            console.error("Current location not available.");
        }
    }).addTo(map);

    let currentLocationMarker;
    let trafficLayer;

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
            console.error(error);
        }, {
            enableHighAccuracy: true,
            timeout: 1000,
            maximumAge: 0
        });
    } else {
        console.error("Geolocation not supported.");
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
            map.setView(currentLocationMarker.getLatLng(), 16);
            currentLocationMarker.openPopup();
        } else {
            console.error("Current location not yet available.");
        }
    });

    // Button to toggle traffic layer
    document.getElementById("toggle-traffic-btn").addEventListener("click", function() {
        if (trafficLayer) {
            map.removeLayer(trafficLayer);
            trafficLayer = null;
        } else {
            trafficLayer = L.tileLayer('https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?style=lite.day&apiKey=FsTaBI0IcCi5PXDF9rXsbFohaO_uJ435fwN5iMAoqSg', {
                attribution: 'Traffic © HERE',
                maxZoom: 18
            }).addTo(map);
        }
    });

    // Button to toggle between normal and satellite view
    document.getElementById("toggle-view-btn").addEventListener("click", function() {
        if (currentLayer === normalLayer) {
            map.removeLayer(normalLayer);
            satelliteLayer.addTo(map);
            currentLayer = satelliteLayer;
        } else {
            map.removeLayer(satelliteLayer);
            normalLayer.addTo(map);
            currentLayer = normalLayer;
        }
    });
});
