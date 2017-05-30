import { Component } from '@angular/core';
import { ViewEncapsulation } from '@angular/core';
import { isPrimitive } from 'util';

// import 'here-js-api/scripts/mapsjs-core';
// import 'here-js-api/scripts/mapsjs-service';
// import 'here-js-api/scripts/mapsjs-ui';
// import 'here-js-api/scripts/mapsjs-mapevents';
// import 'here-datalens-api/scripts/mapsjs-datalens';
// import * as d3 from 'd3';

declare var H: any;
declare var d3: any;

const dummyRoutes: any = [
  [
    { lat: 48.77555365415859, lng: 2.6028451929657876 },
    { lat: 48.54260698776264, lng: 4.815320950556298 },
    { lat: 49.49062499953427, lng: 9.02392805095431 },
    { lat: 51.375858799144304, lng: 12.57061106533584 },
    { lat: 52.37019017538252, lng: 16.956262536008268 }
  ],
  [
    { lat: 48.77555365415859, lng: 2.6028451929657876 },
    { lat: 50.13714016181161, lng: 7.924677518690515 },
    { lat: 52.37019017538252, lng: 16.956262536008268 }
  ],
  [
    { lat: 48.77555365415859, lng: 2.6028451929657876 },
    { lat: 51.443631482079994, lng: 7.240006785216764 },
    { lat: 52.37019017538252, lng: 16.956262536008268 }
  ]
];

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

  private tmpRouteMarkers: any[] = [];
  private routeLines: any[] = [];

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
        rowToTilePoint: function (row) {
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

      // this.map.setViewBounds(new H.geo.Rect(
      //   columnStats.lat_avg.$max,
      //   columnStats.lon_avg.$min,
      //   columnStats.lat_avg.$min,
      //   columnStats.lon_avg.$max
      // ), false);
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
        rowToTilePoint: function (row) {
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
        rowToMapObject: function (cluster) {
          return new H.map.Marker(cluster.getPosition());
        },
        clustering: {
          rowToDataPoint: function (row) {
            return new H.clustering.DataPoint(row.latitude, row.longitude, 1);
          },
          options: function () {
            return {
              eps: 25 * devicePixelRatio, //px
              minWeight: 20
            };
          }
        },
        rowToStyle: function (cluster) {
          const size = 24;

          let icon = H.datalens.ObjectLayer.createIcon([
            'svg',
            {
              viewBox: [-size, -size, 2 * size, 2 * size]
            },
            ['circle', {
              cx: 0,
              cy: 0,
              r: size,
              fill: cluster.isCluster() ? 'orange' : 'transparent'
            }]
          ], { size: size });
          return { icon: icon };
        }
      }
    );

    this.map.addEventListener('tap', (e) => {
      if (e.target instanceof H.map.Marker) {
        console.log(e.target['getData']().getPosition());

        this.tmpRouteMarkers.push(e.target['getData']().getPosition());

        let markerSize = 32;
        let markerColor = this.tmpRouteMarkers.length === 1 ? 'green' : 'red';

        e.target['setIcon'](H.datalens.ObjectLayer.createIcon([
          'svg',
          {
            viewBox: [-markerSize, -markerSize, 2 * markerSize, 2 * markerSize]
          },
          ['circle', {
            cx: 0,
            cy: 0,
            r: markerSize,
            fill: markerColor
          }]
        ], { size: markerSize }));

        console.log(this.tmpRouteMarkers);

        if (this.tmpRouteMarkers.length === 2) {
          Promise.all([
            this.drawRoute(dummyRoutes[0], '#52A3DB', false),
            this.drawRoute(dummyRoutes[2], '#52A3DB', false),
            this.drawRoute([this.tmpRouteMarkers[0], this.tmpRouteMarkers[1]], '#48dad0', true)
          ]).then(() => {
            this.map.removeLayer(this.layerGps);
            this.showRouteInfo = true;
            this.tmpRouteMarkers = [];
          });
        }
      }
    });

    this.map.addLayer(this.layerStopPoints);


    // MARKERS
    // let markers = [
    //   { lat: 52.5, lng: 13.4 },
    //   { lat: 48.707982, lng: 9.169369 }
    // ];
    // this.drawMarkers(markers);
    // this.drawRoute(markers[0], markers[1]);
  }

  drawMarkers = (markers = []): void => {
    this.markerGroup = new H.map.Group();

    let markerHTML = '<div class="marker">' +
      '<div class="marker__icon"></div>' +
      '</div>';

    let icon = new H.map.DomIcon(markerHTML);

    for (let i = markers.length - 1; i >= 0; i--) {
      let marker = new H.map.DomMarker({
        lat: markers[i].lat,
        lng: markers[i].lng
      }, { icon: icon, data: { id: i } });
      this.markerGroup.addObject(marker);
    }

    this.map.addObject(this.markerGroup);
  }

  drawRoute(locations: any, color: string, primary: boolean) {
    return new Promise((resolve, reject) => {
      let routingParameters = {
        // The routing mode:
        'mode': 'fastest;truck',
        // To retrieve the shape of the route we choose the route
        // representation mode 'display'
        'representation': 'display',
        'routeattributes': 'summary'
      };

      locations.forEach((location, index) => {
        routingParameters[`waypoint${ index }`] = 'geo!' + location.lat + ',' + location.lng;
      });

      // Get an instance of the routing service:
      this.router = this.platform.getRoutingService();

      // Call calculateRoute() with the routing parameters,
      // the callback and an error callback function (called if a
      // communication error occurs):
      this.router.calculateRoute(routingParameters, (result) => {
        this.onRoutingResult(result, color, primary);
        resolve();
      }, (error) => {
        console.error(error.message);
        reject();
      });
    });
  }

  onRoutingResult = (result, color: string, primary) => {
    let route;
    let routeShape;
    // let startPoint;
    // let endPoint;
    let strip;

    if (result.response.route) {
      console.log(result.response.route);

      // Pick the first route from the response:
      route = result.response.route[0];
      // console.log(route);

      // Pick the route's shape:
      routeShape = route.shape;

      // Create a strip to use as a point source for the route line
      strip = new H.geo.Strip();

      // Push all the points in the shape into the strip:
      routeShape.forEach(function (point) {
        let parts = point.split(',');
        strip.pushLatLngAlt(parts[0], parts[1]);
      });

      // Retrieve the mapped positions of the requested waypoints:
      // startPoint = route.waypoint[0].mappedPosition;
      // endPoint = route.waypoint[1].mappedPosition;

      // Create a polyline to display the route:
      let routeLine = new H.map.Polyline(strip, {
        style: { strokeColor: color, lineWidth: primary ? 6 : 3 },
        data: { routeInfo: this.transformRouteSummary(route.summary) }
      });

      if (primary) {
        routeLine['setZIndex'](100);
      }

      this.routeLines.push(routeLine);

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
      // this.map.setViewBounds(routeLine.getBounds());

      // output summary infos
      if (route.summary && primary) {
        this.routeInfo = {
          distance: Math.ceil(route.summary.distance / 1000),
          travelTime: Math.ceil(route.summary.travelTime / 60),
          trafficTime: Math.ceil(route.summary.trafficTime / 60)
        };
        // console.log('ETA: '+formatDate(getETA(route.summary.trafficTime), this.datePipe));
      }


      // this.map.addEventListener('tap', (e) => {
      //   if (e.target instanceof H.map.Polyline) {
      //     // for (var i = this.routeLines.length - 1; i >= 0; i--) {
      //     //   this.routeLines[i].setStyle({ strokeColor: 'green', lineWidth: 3 });
      //     // }
      //
      //     this.routeInfo = e.target['getData']().routeInfo;
      //     this.showRouteInfo = true;
      //
      //     e.target['setZIndex'](100);
      //     e.target['setStyle']({
      //       strokeColor: 'yellow',
      //       lineWidth: 5
      //     });
      //   }
      //   else {
      //     this.showRouteInfo = false;
      //     // routeLine.setStyle({ strokeColor: 'green', lineWidth: 3 });
      //     for (var i = this.routeLines.length - 1; i >= 0; i--) {
      //       this.routeLines[i].setStyle({ strokeColor: 'green', lineWidth: 3 });
      //     }
      //   }
      // });
    }
  }

  transformRouteSummary = (summary) => {
    return {
      distance: Math.ceil(summary.distance / 1000),
      travelTime: Math.ceil(summary.travelTime / 60),
      trafficTime: Math.ceil(summary.trafficTime / 60)
    };
  }

  toggleLayer = (layerName): void => {
    if (layerName === 'gps') {
      if (this.isGpsLayerVisible) {
        this.map.removeLayer(this.layerGps);
        this.isGpsLayerVisible = false;
      }
      else {
        this.map.addLayer(this.layerGps);
        this.isGpsLayerVisible = true;
      }
    }
    else if (layerName === 'gps-trace') {
      if (this.isGpsTraceLayerVisible) {
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


