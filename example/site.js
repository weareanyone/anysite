;(function(w, d){
    Anysite({
        js: [],
        images: [],
        init: function() {

        },
        pages: {
            'home_page': {
                init: function () {
                    (function(){
                      // Example module code
                    })();
                }
            },
            'about_page': {
                css: [
                    'example1.css',
                    'example2.css'
                ],
                js: [
                    'example1.js',
                    'example2.js'
                ],
                init: function($page) {
                    (function(){
                      // Example module code
                    })();
                    
                    (function(){
                      // Example module code
                    })();
                }
            }
        },
        options: {
            jsRoot: '/static/libs/anysite/',
            fadeContainer: '#pageContainer',
            fadeDuration: 500
        }
    });
})(window, document);
