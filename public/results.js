$(function () {
	var showLoading = function () {
		$('.loaders').removeClass('hide');
	};

	var hideLoading = function () {
		$('.loaders').addClass('hide');
	};

	$('div.manifest').html('');

	showLoading();

	$.getJSON('start').then(function (data) {
		hideLoading();

		var source   = $("#manifest").html();
		var template = Handlebars.compile(source);
		var html = template(data);
		
		$('div.manifest').html(html);
		
		return data;
  });	

});