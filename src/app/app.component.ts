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
  private isGpsLayerVisible: boolean = true;
  private isGpsTraceLayerVisible: boolean = true;
  private markerGroup: H.map.Group;

  ngOnInit() {
    const platform = new H.service.Platform({
      app_id: this.hereAppId,
      app_code: this.hereAppCode,
      useCIT: true,
      useHTTPS: true
    });

    this.service = platform.configure(new H.datalens.Service());

    const pixelRatio = devicePixelRatio > 1 ? 2 : 1;
    const defaultLayers = platform.createDefaultLayers({ tileSize: 256 * pixelRatio });
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

    this.map.addLayer(this.layerGpsTrace);


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


    // MARKERS
    let markers = [
      { lat: 52.5, lng: 13.4 },
      { lat: 48.707982, lng: 9.169369 }
    ];
    this.drawMarkers(markers);
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
