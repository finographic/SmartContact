	//window.onload = loadScript;

	function loadScriptgmap() {
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBbJ16uUP1tqA_-qsojvMCBV12V71rukHA&' +'callback=initialize';
		document.body.appendChild(script);
	}

	var geocoder, map;
	
	function initialize() {
		geocoder = new google.maps.Geocoder();
    var styles = [
        {
            "featureType": "poi.business",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "hue": "#ff0000"
                }
            ]
        }
    ]

		var styles1 = [
			{
				"stylers": [
					{ "visibility": "on" }
				]
			},
			{
				"featureType": "landscape.natural",
					"stylers": [
						{ "visibility": "simplified" },
						{ "color": "#f0f0f0" }
					]
			},
			{
				"featureType": "water",
				"stylers": [
					{ "visibility": "simplified" },
					{ "color": "#C2E7F5" }
				]
			},
			{
				"featureType": "road.highway",
				"elementType": "geometry",
				"stylers": [
					{ "visibility": "simplified" },
					{ "color": "#ffffff" }
				]
			},
			{
				"featureType": "road.local",
				"elementType": "geometry.stroke",
				"stylers": [
					{ "visibility": "off" }
				]
			},
			{
				"featureType": "road.local",
				"elementType": "labels.icon",
				"stylers": [
					{ "visibility": "off" }
				]
			},
			{
				"elementType": "labels.text.fill",
				"stylers": [
					{ "visibility": "on" },
					{ "color": "#646464" }
				]
			},
			{
				"featureType": "road.local",
				"elementType": "geometry.fill",
				"stylers": [
					{ "visibility": "on" },
					{ "weight": 1 },
					{ "color": "#ffffff" }
				]
			},
			{
				"featureType": "poi.park",
				"elementType": "geometry.fill",
				"stylers": [
					{ "lightness": 90 },
					{ "color": "#d7d7d7" },
					{ "visibility": "off" }
				]
			},
			{
				"featureType": "transit",
				"elementType": "geometry",
				"stylers": [
					{ "visibility": "on" },
					{ "color": "#ffffff" }
				]
			},
			{
				"featureType": "road.local",
				"elementType": "labels.text.fill",
				"stylers": [
					{ "visibility": "on" },
					{ "color": "#b8b8b8" }
				]
			},
			{
				"featureType": "landscape.man_made",
				"elementType": "geometry",
				"stylers": [
					{ "visibility": "on" },
					{ "lightness": 60 },
					{ "saturation": -90 },
					{ "gamma": 0.90 }
				]
			}
		];
		
		var styledMap = new google.maps.StyledMapType(styles, {
			name: "Styled Map"
		});
			
		var mapOptions = {
        zoom: 12,
  
			scrollwheel: false,
			panControl: false,
			scaleControl: false,
			mapTypeControlOptions: {
				mapTypeIds: []
			}
		};
		
		map = new google.maps.Map(document.getElementById('map-canvasv1'), mapOptions);
		map.mapTypes.set('map_style', styledMap);
		map.setMapTypeId('map_style');
		
		codeAddress(currentrecord);
	}





var latlongz = "";
    




function codeAddress(rec) {
    
    var address = "";
    address = rec.contact_addr + ',' + rec.contact_city + ',' + rec.contact_state + ',' + rec.contact_zip;

    console.log('updated address');
    console.log(address);
 

		geocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
            latlongz = results[0].geometry.location;
           	var image = new google.maps.MarkerImage("assets/img/location-pin.png", null, null, null, new google.maps.Size(32, 32));
            var beachMarker = new google.maps.Marker({
                optimized: false,
					map: map,
					icon: image,
					position: results[0].geometry.location
				});


            console.log(results[0].geometry.location.lat());

           // map.setCenter(new google.maps.LatLng(results[0].geometry.location));
        

            $('.addr_modal_maps').html(address.replace(/,/g,', '));

			} else {
           // map.setCenter(latlongz);
            $('.addr_modal_maps').html('');

            console.log('Geocode was not successful for the following reason: ' + status);
			}
    });



	}

