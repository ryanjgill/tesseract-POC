var express = require('express');
var tesseract = require('node-tesseract');
var colors = require('colors');
var fs = require('fs');
var path = require('path');
var async = require('async');
var util = require('util');
var pdfText = require('pdf-text');
var multer = require('multer');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var done = false;

var app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/index.html'));

/*Configure the multer.*/
app.use(
	multer({
		dest: './uploads/',
		rename: function (fieldname, filename) {
		  return filename.replace(/ /g, '_');
		},
		onFileUploadStart: function (file) {

		},
		onFileUploadComplete: function (file) {
		  console.log(file.originalname.cyan + ' uploaded to  ' + file.path.yellow);
		  done=true;
		}
	})
);

var manifest = [];

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

	app.get('/', function (req, res) {
	  res.sendFile(path.join(__dirname + '/public/index.html'));
	});

	app.post('/uploads',function(req,res){
	  if(done==true){
	    console.log(req.files);
	    res.sendFile(path.join(__dirname + '/public/results.html'));
	  }
	});

	app.get('/start', function (req, res) {
		var folder = 'uploads';
	  var supportedTypes = [".JPG", ".jpg", ".tif"];

	  manifest = [];

	  console.log('inside GET /start');
	  console.log('Tesseract OCR app listening at http://%s:%s'.green, host, port);
	  console.log('dir: '.yellow + __dirname.yellow.bold);

	  // loop over directory and get all the images
		fs.readdir(__dirname + '\\' + folder + '\\', function(err, files) {
	    console.log('List of files: ');
	    files.forEach(function(file) {
	    	console.log(file);
	    });


	    var temp = files.filter(function (file) {
				return supportedTypes.indexOf(path.extname(file)) >= 0;
			});

			var pdfs = files.filter(function (file) {
				return ['.pdf', '.PDF'].indexOf(path.extname(file)) >= 0;
			});

			console.log(colors.cyan.bold('%s of %s files are PDFs!'), pdfs.length, files.length);
			console.log('List of PDFs: '.yellow.bold);
			pdfs.forEach(function(file) {
	    	console.log(file.red);
	    });

			console.log(colors.cyan.bold('%s of %s files are Images!'), temp.length, files.length);
			console.log('List of images: '.yellow.bold);

			temp.forEach(function(file) {
	    	console.log(file.cyan);
	    });

			// Process both the tesseract OCR and PDf reading and then send the results back
	    async.parallel([
	    	// do the OCR
	    	function (cb) {
	    		console.log(colors.bold.red('************ starting the OCR ***************'));
			    async.each(temp, function (file, done) {
			    	console.log(file.yellow.bold);
			    	processOCR(folder, file, done);
			    	//done(); // I fucked something up :(
			    }, function (err) {
			    	if (err) {
			    		console.log(err);
			    	}
			    	console.log(colors.bold.red('************ ending the OCR ***************'));
			    	cb();
			    });
	    	},
	    	// do the PDFs
	    	function (cb) {
	    		console.log(colors.bold.red('************ starting the PDFs ***************'));
			    async.each(pdfs, function (file, done) {
			    	processPDF(folder, file, done);
			    }, function (err) {
			    	if (err) {
			    		console.log(err);
			    	}
			    	console.log(colors.bold.red('************ ending the PDFs ***************'));
			    	cb();
			    });
	    	}
	    ], function (err, results) {
	    	console.log("Manifest updated successfully!".green);
	    	rimraf(__dirname + '/uploads', function () {
	    		console.log('removed uploads directory'.red);
	    		mkdirp(__dirname + '/uploads', function () {
	    			console.log('created uploads directory'.green);
	    		});
	    	});
	    	res.send(manifest);
	    }); 
	    
		});


	});

});



// Recognize text of any language in any format
var options = {
    l: 'eng',
    psm: 6
};

var processOCR = function (folder, file, done) {
	tesseract.process(__dirname + '/' + folder + '/' + file, options, function (err, text) {
		if(err) {
		    console.error(err);
		} else {
				console.log(file.cyan.bold + ' was scanned ' + 'successfully!'.green);

		    manifest.push({
		    	"fileText": text,
		    	"meta": {
		    		"path": __dirname + '\\images\\',
		    		"name": file,
		    		"type": path.extname(file),
		    	}
		    });

		    done();
		}
	});
};


var processPDF = function (folder, file, done) {
	var pathToPdf = __dirname + "\\" + folder + "\\" + file;

	pdfText(pathToPdf, function (err, chunks) {
		// chunks is an array of strings 
  	// loosely corresponding to text objects within the pdf
  	var text = chunks.join(' ');

  	manifest.push({
  		"fileText": text,
    	"meta": {
    		"path": __dirname + '\\images\\',
    		"name": file,
    		"type": path.extname(file)
    	}
  	});

  	console.log(file.cyan.bold + ' was scanned ' + 'successfully!'.green);

  	done();

	});

};



