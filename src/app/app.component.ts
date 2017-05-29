import { Component } from '@angular/core';
// import 'here-js-api/scripts/mapsjs-core';
// import 'here-js-api/scripts/mapsjs-service';

declare var H: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private hereAppId = 'QbpUpuHWnP4m9zJNq5sz';
  private hereAppCode = 'kbXjBIaQXC8lFg6QLEO4Ag';
  private service;
  private map: any;

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

    // window.addEventListener('resize', function() {
    //     this.map.getViewPort().resize();
    // });

    new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
    const ui = H.ui.UI.createDefault(this.map, defaultLayers);

    let queryId = '5af379a97e254a158aae22938a6eb508';

    this.service.fetchQueryStats(queryId, {
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
      console.log(stats);
      const columnStats = stats[0].column_stats;

      this.map.setViewBounds(new H.geo.Rect(
        columnStats.lat_avg.$max,
        columnStats.lon_avg.$min,
        columnStats.lat_avg.$min,
        columnStats.lon_avg.$max
      ), false);
    });


    const provider = new H.datalens.QueryTileProvider(
      this.service, {
        queryId: queryId,
        tileParamNames: {
          x: 'x',
          y: 'y',
          z: 'z'
        }
      }
    );

    const layer = new H.datalens.HeatmapLayer(
      provider, {
        rowToTilePoint: function(row) {
          return {
            x: row.tx,
            y: row.ty,
            value: row.count,
            count: 1
          };
        },
        bandwidth: 1
      }
    );

    this.map.addLayer(layer);
  }
}
