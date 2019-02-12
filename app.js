var http = require('http')
	, express = require('express')
	, fs = require('fs')
	, md5File = require('md5-file')
	, os = require("os");

global.config = require('./config.js');
var app = express();

app.set('port', config.port || 9999);

app.get('*', function(req, res) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Cluster', os.hostname());
	var width = 500;
	var height = 500;
	var resizePath = '';
	var imageName = '';
	var hasResize = false;

	// หาขนาดรูปที่ต้องการ เช่น /500x500/category/bag/1.jpg
	var sp = req.url.split('/');
	if( sp.length >= 2 ) {
		sp2 = sp[1].split('x');
		if( sp2.length == 2 ) {
			if (!isNaN(parseFloat(sp2[0])) && isFinite(sp2[0]) && !isNaN(parseFloat(sp2[1])) && isFinite(sp2[1])) {
				hasResize = true;
				width = parseFloat(sp2[0]);
				height = parseFloat(sp2[1]);
				req.url = req.url.replace( '/'+sp[1], '' );
				imageName = sp[4];
				resizePath = config.imageResizePath+'/'+sp[2]+'/'+sp[3];
				if (!fs.existsSync(config.imageResizePath+'/'+sp[2])){
					fs.mkdirSync(config.imageResizePath+'/'+sp[2]);
				}				
				if (!fs.existsSync(config.imageResizePath+'/'+sp[2]+'/'+sp[3])){
					fs.mkdirSync(config.imageResizePath+'/'+sp[2]+'/'+sp[3]);
				}
			}
		}
		else {
			imageName = sp[3];
			resizePath = config.imageResizePath+'/'+sp[1]+'/'+sp[2];
			if (!fs.existsSync(config.imageResizePath+'/'+sp[1])){
				fs.mkdirSync(config.imageResizePath+'/'+sp[1]);
			}				
			if (!fs.existsSync(config.imageResizePath+'/'+sp[1]+'/'+sp[2])){
				fs.mkdirSync(config.imageResizePath+'/'+sp[1]+'/'+sp[2]);
			}
		}
	}

	var name = config.imagePath+req.url;
	fs.exists(name, function (exists) {
		if (exists){

			var md5 = md5File(name);
			var resizeName = resizePath+'/'+md5+'-'+(hasResize ? width+'x'+height+'-' : '') +imageName;

			fs.exists(resizeName, function (exists) {
				if (exists){
					//console.log('use '+ resizeName);
					var stream = fs.createReadStream(resizeName);
					stream.pipe(res);
				}
				else {
					purgeCache(`${resizePath.replace(config.imageResizePath,'')}/${imageName}`, 'prodathailand.com', 'comsci_erb@msn.com', 'f281bc6253510e22a44ce010dac9c7f6', '17eef9d92ac87294ba75636c0ea18821e810e');
					//console.log('generate '+ resizeName);
					const sharp = require('sharp');
					sharp(name).metadata().then(value => {
						var box = value.width > value.height ? value.height/4 : value.width/4;
						var textWidth = box*4/3;
						var textHeight = textWidth/8;
						var count = 5;
						var boxSplit = value.height/count;
						var gabX = ((value.width/2)-textWidth)/2;
						var gabY = (boxSplit-textHeight)/2;
						if (name.toLowerCase().indexOf('.gif') == -1) {
						}

						if ( hasResize ) { // ถ้า Url ที่ส่งมากำหนดขนาดมาด้วย
							sharp(config.imageLogoPath)
							.resize(box)
							.sharpen()
							.webp( { quality: 90 } )
							.toBuffer()
							.then((imgBuffer) => {
								sharp(name)
								.resize(width)
								.overlayWith(imgBuffer, { gravity: sharp.gravity.southeast } )
								.sharpen()
								.webp( { quality: 90 } )
								.toFile(resizeName)
								.then(info => {
									var stream = fs.createReadStream(resizeName);
									stream.pipe(res);
								});
							});
						}
						else {
							sharp(config.imageLogoPath)
							.resize(box)
							.sharpen()
							.webp( { quality: 90 } )
							.toBuffer()
							.then((imgBuffer) => {
								sharp(name)
								.overlayWith(imgBuffer, { gravity: sharp.gravity.southeast } )
								.sharpen()
								.webp( { quality: 90 } )
								.toFile(resizeName)
								.then(info => {
									var stream = fs.createReadStream(resizeName);
									stream.pipe(res);
								});
							});
						}
					});
				}
			});
		}
		else {
			//console.log('no image');
			var stream = fs.createReadStream(config.imageLogoPath);
			stream.pipe(res);
		}
	});


});

var server = http.createServer(app);
server.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port') + ' at '+os.hostname());
});

function purgeCache(path, domain, email, zone, key){
  
  var request = require("request");

  var options = {
    method: 'POST',
    url: `https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`,
    headers: {
      'cache-control': 'no-cache',
      'Content-Type': 'application/json',
      'X-Auth-Email': email,
      'X-Auth-Key': key
    },
    formData: {
      'files[0]': `https://images.${domain}${path}`,
      'files[1]': `https://img.${domain}${path}`,
      'files[2]': `https://img.${domain}/50x50${path}`,
      'files[3]': `https://img.${domain}/100x100${path}`,
      'files[4]': `https://img.${domain}/300x300${path}`,
      'files[5]': `https://img.${domain}/500x500${path}`
    }
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    console.log(body);
  });
}
