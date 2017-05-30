import { Component } from '@angular/core';
import { ViewEncapsulation } from '@angular/core';

// import 'here-js-api/scripts/mapsjs-core';
// import 'here-js-api/scripts/mapsjs-service';
// import 'here-js-api/scripts/mapsjs-ui';
// import 'here-js-api/scripts/mapsjs-mapevents';
// import 'here-datalens-api/scripts/mapsjs-datalens';
// import * as d3 from 'd3';


declare var H: any;
declare var d3: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  private hereAppId = 'QbpUpuHWnP4m9zJNq5sz';
  private hereAppCode = 'kbXjBIaQXC8lFg6QLEO4Ag';
  private service;
  private map: H.Map;
  private layerGps: H.datalens.HeatmapLayer;
  private layerGpsTrace: H.datalens.HeatmapLayer;
  private layerStopPoints: H.datalens.ObjectLayer;
  private isGpsLayerVisible: boolean = true;
  private isGpsTraceLayerVisible: boolean = true;
  private markerGroup: H.map.Group;
  private platform: H.service.Platform;
  private router: any;
  private routeInfo: any;
  private showRouteInfo: boolean = false;

  ngOnInit() {
    this.platform = new H.service.Platform({
      app_id: this.hereAppId,
      app_code: this.hereAppCode,
      useCIT: true,
      useHTTPS: true
    });

    this.service = this.platform.configure(new H.datalens.Service());

    const pixelRatio = devicePixelRatio > 1 ? 2 : 1;
    const defaultLayers = this.platform.createDefaultLayers({ tileSize: 256 * pixelRatio });
    this.map = new H.Map(
      document.getElementById('map'),
      defaultLayers.normal.basenight,
      {
        zoom: 12,
        center: { lat: 52.5, lng: 13.4 },
        pixelRatio
      }
    );

    window.addEventListener('resize', () => {
      this.map.getViewPort().resize();
    });

    new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
    const ui = H.ui.UI.createDefault(this.map, defaultLayers);


    // DATASET: GPS TRACE
    let queryIdGpsTrace = '5af379a97e254a158aae22938a6eb508';
    this.service.fetchQueryStats(queryIdGpsTrace, {
      stats: [
        {
          column_stats: {
            lat_avg: ['$min', '$max'],
            lon_avg: ['$min', '$max']
          },
          dynamic: {
            x: '$drop',
            y: '$drop',
            z: 15
          }
        }
      ]
    }).then(({ stats }) => {
      const columnStats = stats[0].column_stats;

      this.map.setViewBounds(new H.geo.Rect(
        columnStats.lat_avg.$max,
        columnStats.lon_avg.$min,
        columnStats.lat_avg.$min,
        columnStats.lon_avg.$max
      ), false);
    });

    const providerGpsTrace = new H.datalens.QueryTileProvider(
      this.service, {
        queryId: queryIdGpsTrace,
        tileParamNames: {
          x: 'x',
          y: 'y',
          z: 'z'
        }
      }
    );

    this.layerGpsTrace = new H.datalens.HeatmapLayer(
      providerGpsTrace, {
        rowToTilePoint: function(row) {
          return {
            x: row.tx,
            y: row.ty,
            value: row.count,
            count: 1
          };
        },
        bandwidth: 2,
        // TODO: PR for typings
        colorScale: d3.scaleLinear().domain([0, 1]).range([
          'rgba(255, 0, 0, 0)',
          'rgba(255, 0, 0, 1)'
        ])
      }
    );

    // this.map.addLayer(this.layerGpsTrace);


    // DATASET: GPS
    let queryIdGps = '8ad75113b6b245649202ae2e1bf46099';
    this.service.fetchQueryStats(queryIdGps, {
      stats: [
        {
          column_stats: {
            lat_avg: ['$min', '$max'],
            lon_avg: ['$min', '$max']
          },
          dynamic: {
            x: '$drop',
            y: '$drop',
            z: 15
          }
        }
      ]
    }).then(({ stats }) => {
      const columnStats = stats[0].column_stats;

      this.map.setViewBounds(new H.geo.Rect(
        columnStats.lat_avg.$max,
        columnStats.lon_avg.$min,
        columnStats.lat_avg.$min,
        columnStats.lon_avg.$max
      ), false);
    });

    const providerGps = new H.datalens.QueryTileProvider(
      this.service, {
        queryId: queryIdGps,
        tileParamNames: {
          x: 'x',
          y: 'y',
          z: 'z'
        }
      }
    );

    this.layerGps = new H.datalens.HeatmapLayer(
      providerGps, {
        // TODO: fix typings: row: number
        rowToTilePoint: function(row) {
          return {
            x: row.tx,
            y: row.ty,
            value: row.count,
            count: 1
          };
        },
        bandwidth: .5,
        colorScale: d3.scaleLinear().domain([0, 1]).range([
          'rgba(0, 0, 255, 0)',
          'rgba(0, 0, 255, 1)'
        ])
      }
    );

    this.map.addLayer(this.layerGps);



    // STOP POINTS
    let stopPointsIdGps = 'ead20d99ce5f4b14957e4f4775388468';

    const providerStopPoints = new H.datalens.QueryTileProvider(
      this.service, {
        queryId: stopPointsIdGps,
        tileParamNames: {
          x: 'x',
          y: 'y',
          z: 'z'
        }
      }
    );

    this.layerStopPoints = new H.datalens.ObjectLayer(
      providerStopPoints, {
        rowToMapObject: function(cluster){
          return new H.map.Marker(cluster.getPosition());
        },
        clustering: {
          rowToDataPoint: function(row) {
            return new H.clustering.DataPoint(row.latitude, row.longitude, 1);
          },
          options: function(){
            return {
              eps: 50 * devicePixelRatio //px
            };
          }
        }
      }
    );

    this.map.addLayer(this.layerStopPoints);


    // MARKERS
    let markers = [
      { lat: 52.5, lng: 13.4 },
      { lat: 48.707982, lng: 9.169369 }
    ];
    this.drawMarkers(markers);
    this.drawRoute(markers[0], markers[1]);
  }

  drawMarkers = (markers = []): void => {
    this.markerGroup = new H.map.Group();

    let markerHTML = '<div class="marker">'+
      '<div class="marker__icon"></div>'+
    '</div>';

    let icon = new H.map.DomIcon(markerHTML);

    for (let i = markers.length - 1; i >= 0; i--) {
      let marker = new H.map.DomMarker({ lat: markers[i].lat, lng: markers[i].lng }, { icon: icon, data: { id: i } });
      this.markerGroup.addObject(marker);
    }

    this.map.addObject(this.markerGroup);
  }

  drawRoute(location1, location2) {
    // console.log('––> drawRoute: '+location1.title+' ––> '+location2.title);
    let routingParameters = {
      // The routing mode:
      'mode': 'fastest;truck',
      // The start point of the route:
      'waypoint0': 'geo!'+location1.lat+','+location1.lng,
      // The end point of the route:
      'waypoint1': 'geo!'+location2.lat+','+location2.lng,
      // To retrieve the shape of the route we choose the route
      // representation mode 'display'
      'representation': 'display',
      'routeattributes': 'summary'
    };

    // Get an instance of the routing service:
    this.router = this.platform.getRoutingService();

    // Call calculateRoute() with the routing parameters,
    // the callback and an error callback function (called if a
    // communication error occurs):
    this.router.calculateRoute(routingParameters, this.onRoutingResult,
      function(error) {
        console.error(error.message);
      }
    );
  }

  onRoutingResult = (result) => {
    let route;
    let routeShape;
    // let startPoint;
    // let endPoint;
    let strip;

    if(result.response.route) {
      console.log(result.response.route);

      // Pick the first route from the response:
      route = result.response.route[0];
      // console.log(route);

      // Pick the route's shape:
      routeShape = route.shape;

      // Create a strip to use as a point source for the route line
      strip = new H.geo.Strip();

      // Push all the points in the shape into the strip:
      routeShape.forEach(function(point) {
        let parts = point.split(',');
        strip.pushLatLngAlt(parts[0], parts[1]);
      });

      // Retrieve the mapped positions of the requested waypoints:
      // startPoint = route.waypoint[0].mappedPosition;
      // endPoint = route.waypoint[1].mappedPosition;

      // Create a polyline to display the route:
      let routeLine = new H.map.Polyline(strip, {
        style: { strokeColor: 'green', lineWidth: 3 }
      });

      // Create a marker for the start point:
      // let startMarker = new H.map.Marker({
      //   lat: startPoint.latitude,
      //   lng: startPoint.longitude
      // });

      // // Create a marker for the end point:
      // let endMarker = new H.map.Marker({
      //   lat: endPoint.latitude,
      //   lng: endPoint.longitude
      // });

      // Add the route polyline and the two markers to the map:
      // this.map.addObjects([routeLine, startMarker, endMarker]);
      this.map.addObjects([routeLine]);

      // Set the map's viewport to make the whole route visible:
      this.map.setViewBounds(routeLine.getBounds());

      // output summary infos
      if(route.summary){
        this.routeInfo = {
          distance: Math.ceil(route.summary.distance/1000),
          travelTime: Math.ceil(route.summary.travelTime/60),
          trafficTime: Math.ceil(route.summary.trafficTime/60)
        };
        // console.log('ETA: '+formatDate(getETA(route.summary.trafficTime), this.datePipe));
      }


      this.map.addEventListener('tap', (e) => {
        if(e.target === routeLine){
          console.log('––> clicked route');
          this.showRouteInfo = true;
          routeLine.setStyle({ strokeColor: 'yellow', lineWidth: 3 });
        }
        else {
          this.showRouteInfo = false;
          routeLine.setStyle({ strokeColor: 'green', lineWidth: 3 });
        }
      });
    }
  }

  toggleLayer = (layerName): void => {
    if(layerName === 'gps'){
      if(this.isGpsLayerVisible){
        this.map.removeLayer(this.layerGps);
        this.isGpsLayerVisible = false;
      }
      else {
        this.map.addLayer(this.layerGps);
        this.isGpsLayerVisible = true;
      }
    }
    else if(layerName === 'gps-trace'){
      if(this.isGpsTraceLayerVisible){
        this.map.removeLayer(this.layerGpsTrace);
        this.isGpsTraceLayerVisible = false;
      }
      else {
        this.map.addLayer(this.layerGpsTrace);
        this.isGpsTraceLayerVisible = true;
      }
    }
  }
}
