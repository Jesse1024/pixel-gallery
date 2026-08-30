var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var manifestPath = path.join(root, 'js', 'photos-data.js');
var captionsPath = path.join(__dirname, 'captions.json');

var raw = fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '');
var json = raw.replace(/^window\.SERIES\s*=\s*/, '').replace(/;\s*$/, '');
var series = JSON.parse(json);
var captions = JSON.parse(fs.readFileSync(captionsPath, 'utf8'));

var ghostCount = 0;
var captionCount = 0;

series.forEach(function (s) {
  var kept = [];
  s.photos.forEach(function (p) {
    var file = path.join(root, p.src.split('/').join(path.sep));
    if (!fs.existsSync(file)) {
      ghostCount++;
      console.log('ghost removed: ' + p.src);
      return;
    }
    var key = s.id + '/' + path.basename(p.src);
    if (captions[key]) {
      p.caption = captions[key];
      captionCount++;
    }
    kept.push(p);
  });
  s.photos = kept;
});

var out = 'window.SERIES = ' + JSON.stringify(series, null, 4) + ';\n';
fs.writeFileSync(manifestPath, out, 'utf8');
console.log('done. photos kept, captions applied: ' + captionCount + ', ghosts removed: ' + ghostCount);
