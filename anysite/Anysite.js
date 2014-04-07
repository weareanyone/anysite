/*
 *  Anysite - AJAX Page Loader
 *  (c) 2012 Anyone Collective
 *  www.weareanyone.com
 */
;Anysite = (function(w,d,u) {
    function Anysite(site) {
        this.site = site || {};

        if (typeof w.jQuery === 'undefined')
            this.loadJQuery();
        else
            this.loadSiteJs();
    }

    Anysite.prototype = {
        loadJQuery: function() {
            this.loadJsFile(this.jQueryUrl, this.loadSiteJs);
        },
        loadSiteJs: function() {
            this.o = $.extend({}, this.defaults, this.site.options || {});
            this.initLoader();
            this.addBodyClasses();
            this.loadJsArray($.merge(this.getRequiredJs(), this.site.js || []), this.init);
        },
        addBodyClasses: function() {
            var $body = $('body');
            if ($.browser.msie) {
                $body.addClass('msie');
                var version = window.navigator.userAgent.substring(0,window.navigator.userAgent.indexOf('.'));
                $body.addClass('msie'+ version);
            }
            if ($.browser.webkit) {
                $body.addClass('webkit');
            }
            if ($.browser.mozilla) {
                $body.addClass('mozilla');
            }
        },
        init: function() {
            var self = this,
                $contentPage = $(self.o.pageSelector +':first'),
                contentImages = $contentPage.find('img').map(function(){return this.src}),
                pageId = $contentPage.attr('id');

            if (typeof self.site.init === 'function') self.site.init();
            this.initAjax();

            contentImages = $.merge(self.site.images || [], contentImages);
            this.loadPage(pageId, contentImages, function() {
                self.hideLoader();
                $contentPage.fadeIn(800, function() {
                    $(d.body).removeClass(self.o.loadingClass);
                    self.loading = false;
                });
            });
        },
        initAjax: function() {
            /*
             *  Ajaxify Inspiration from:
             *  https://gist.github.com/854622
             *  by balupton
             */
            if (!History.enabled) return false;

            var self = this,
                $content = $(self.o.contentSelector +':first'),
                $menu = $(self.o.navSelector),
                rootUrl = History.getRootUrl(),
                documentHtml = function(html) {
                    return String(html)
                            .replace(/<\!DOCTYPE[^>]*>/i, '')
                            .replace(/<(html|head|body|title|meta|script)([\s\>])/gi,'<div class="document-$1"$2')
                            .replace(/<\/(html|head|body|title|meta|script)\>/gi,'</div>');
                };

            $.expr[':'].internal = function(obj, index, meta, stack) {
                var $this = $(obj),
                    url = $this.attr('href') || '',
                    isInternalLink;

                isInternalLink = url.substring(0, rootUrl.length) === rootUrl || url.indexOf(':') === -1;
                return isInternalLink;
            };

            $.fn.ajaxify = function() {
                var $this = $(this);
                $this.find('a:internal:not(.no-ajax)').click(function(event) {
                    if (self.loading) return false;
                    var $this = $(this),
                        url = $this.attr('href'),
                        title = $this.attr('title') || null,
                        hashPos = url.indexOf('#'), hash;

                    // Continue as normal for cmd clicks etc
                    if (event.which == 2 || event.metaKey) {return true;}

                    if (hashPos > -1) {
                        hash = url.substr(hashPos);
                        url = url.substring(0, hashPos);
                    }

                    History.pushState(null, title, url);
                    if (hash) w.location.hash = hash;
                    event.preventDefault();
                    return false;
                });
                return $this;
            };

            $(d.body).ajaxify();

            $(w).bind('statechange', function() {
                self.loading = true;
                self.showLoader();

                var $contentPage = $content.find(self.o.pageSelector +':first'),
                    State = History.getState(),
                    url = State.url,
                    relativeUrl = url.replace(rootUrl,''),
                    firstUrl = relativeUrl.split('/')[0];

                $menu.find(self.o.navChildrenSelector).removeClass(self.o.activeClass)
                    .has('a[href^="'+relativeUrl+'"],a[href="/'+relativeUrl+'"],'+
                    'a[href^="/'+relativeUrl+'"],a[href^="/'+firstUrl+'"],a[href^="'+url+'"]')
                    .filter(':first').addClass(self.o.activeClass);

                $contentPage.fadeOut(800, function() {
                    $content.stop(true, true);

                    $.ajax({
                        url: url,
                        success: function(data) {
                            var $data = $(documentHtml(data)),
                                $dataBody = $data.find('.document-body:first'),
                                $dataContent = $dataBody.find(self.o.contentSelector +':first'),
                                $dataContentPage = $dataContent.find(self.o.pageSelector +':first').hide(),
                                $scripts = $dataContent.find('.document-script'),
                                contentImages = $dataContent.find('img').map(function(){return this.src}),
                                contentHtml;

                            if ($scripts.length) $scripts.detach();

                            contentHtml = $dataContent.html();
                            if (!contentHtml) {
                                d.location.href = url;
                                return false;
                            }

                            $content.stop(true, true);
                            $content.html(contentHtml).ajaxify();
                            $contentPage = $content.find(self.o.pageSelector);

                            self.loadPage($contentPage.attr('id'), contentImages, function() {
                                $scripts.each(function() {
                                    var scriptText = $(this).text(),
                                        scriptNode = d.createElement('script');
                                    scriptNode.appendChild(d.createTextNode(scriptText));
                                    $content.get(0).appendChild(scriptNode);
                                });
                                self.hideLoader();
                                $contentPage.fadeIn(800, function() {
                                    self.loading = false;
                                });
                            });

                            d.title = $data.find('.document-title:first').text();
                            try {
                                d.getElementsByTagName('title')[0].innerHTML = d.title.replace('<','&lt;')
                                                                                      .replace('>','&gt;')
                                                                                      .replace(' & ',' &amp; ');
                            } catch (Exception) {}

                            // Inform Google Analytics of the change
                            if (typeof w.pageTracker !== 'undefined') {
                                w.pageTracker._trackPageview(relativeUrl);
                            }
                        },
                        error: function() {
                            d.location.href = url;
                            return false;
                        }
                    })
                });
            });
        },
        loadPage: function(pageId, images, success) {
            var self = this,
                page = (pageId in self.site.pages) ? self.site.pages[pageId] : {},

            // Initialize page after JS and Images load
                jsReady = false, imagesReady = false,
                pageReady = function() {
                    if (typeof success === 'function') success.apply(self);
                    if (typeof page.init === 'function') page.init();
                },
                completeJs = function() {
                    jsReady = true;
                    if (imagesReady) pageReady();
                },
                completeImages = function() {
                    imagesReady = true;
                    if (jsReady) pageReady();
                };

            // Load CSS
            if ('css' in page)
                self.loadCssArray(page.css);

            // Load JS and call jsComplete
            if ('js' in page)
                self.loadJsArray(page.js, completeJs);
            else
                completeJs();

            // Load Images
            images = $.merge(images || [], page.images || []);
            if (images.length) {
                var i, loader = new PxLoader({statusInterval:3000});
                for (i=0;i<images.length;i++)
                    loader.addImage(images[i]);

                self.showFileLoader();
                loader.addProgressListener($.proxy(self.updateFileLoader, self));
                loader.addCompletionListener(completeImages);
                loader.start();
            } else {
                completeImages();
            }
        },

        // Loader bar methods
        initLoader: function() {
            this.progressInterval = null;
            this.$loader = $('<div class="'+ this.o.loadingClass +'-container"></div>').appendTo($(d.body));
            this.showLoader();
        },
        showLoader: function() {
            this.$loader.html(''+
                    '<p class="'+ this.o.loadingClass +'-text">Loading Page</p>'+
                    '<p class="'+ this.o.loadingClass +'-percent">0%</p>'+
                    '<div class="'+ this.o.loadingClass +'-progress">'+
                        '<div class="'+ this.o.loadingClass +'-bar"></div>'+
                    '</div>');
            this.$loader.fadeIn(800);
        },
        showFileLoader: function() {
            this.$loader.find('.'+ this.o.loadingClass +'-percent,'+
                              '.'+ this.o.loadingClass +'-progress').show();
            this.$loader.find('.'+ this.o.loadingClass +'-text').text('Loading Images');
        },
        updateFileLoader: function(e) {
            var self = this,
                completed = e.completedCount,
                total = e.totalCount,
                percent = Math.round(completed / total * 100),
                $bar = self.$loader.find('.'+ self.o.loadingClass +'-bar')
                                   .stop(true).animate({width: percent +'%'}, 100),
                $percent = self.$loader.find('.'+ self.o.loadingClass +'-percent'),
                current = parseInt($percent.text()),
                progressAdd = Math.floor((percent - current) / 5),
                progressLoop = function() {
                    current += progressAdd;
                    if (current > percent) {
                        current = percent;
                        clearInterval(self.progressInterval);
                    }
                    $percent.text(current +'%');
                };
            clearInterval(self.progressInterval);
            self.progressInterval = setInterval(progressLoop, 20);
        },
        hideLoader: function() {
            this.$loader.stop(true).fadeOut(400);
        },

        // Loading methods to dynamically load JS and CSS files
        loadCssArray: function(cssArr) {
            for (var i=0,cssUrl;i<cssArr.length;i++) {
                cssUrl = cssArr[i];
                if (arrayContains(this.loadedCss, cssUrl)) break;
                this.loadedCss.push(cssUrl);

                this.loadCssFile(cssUrl);
            }
        },
        loadCssFile: function(cssUrl) {
            var cssElem = d.createElement('link');
            cssElem.setAttribute("rel", "stylesheet");
            cssElem.setAttribute("type","text/css");
            cssElem.setAttribute("href", cssUrl);
            d.getElementsByTagName("head")[0].appendChild(cssElem);
        },
        loadJsArray: function(jsArr, success, i) {
            if (!jsArr.length) {
                if (typeof success === 'function') success.apply(this);
                return;
            }

            i = i || 0;
            var self = this,
                jsUrl = jsArr[i],
                loadNextJs = function() {
                    if (i+1 < jsArr.length)
                        self.loadJsArray(jsArr, success, i+1);
                    else if (typeof success === 'function')
                        success.apply(self);
                };

            if (arrayContains(self.loadedJs, jsUrl)) {
                loadNextJs();
            } else {
                self.loadedJs.push(jsUrl);
                self.loadJsFile(jsUrl, loadNextJs);
            }
        },
        loadJsFile: function(jsUrl, success) {
            var self = this,
                jsElem = d.createElement('script'),
                done = false;
            jsElem.setAttribute("type","text/javascript");
            jsElem.setAttribute("src", jsUrl);
            jsElem.onload = jsElem.onreadystatechange = function() {
                if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
                    done = true;
                    success.apply(self);
                    jsElem.onload = jsElem.onreadystatechange = null;
                    d.getElementsByTagName("head")[0].removeChild(jsElem);
                }
            };
            d.getElementsByTagName("head")[0].appendChild(jsElem);
        },

        getRequiredJs: function() {
            var self = this;
            return $.map(self.requiredJs, function(val){
                return self.o.jsRoot + val;
            });
        },
        initialized: false,
        loading: true,
        loadedCss: [],
        loadedJs: [],
        jQueryUrl: '//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js',
        requiredJs: [
            'jquery.history.js', // History.js
            'PxLoader-min.js'    // PxLoader & PxLoader-Image
        ],
        defaults: {
            contentSelector: '#content',
            pageSelector: '.content_page',
            navSelector: 'nav',
            navChildrenSelector: '> ul > li',
            activeClass: 'active',
            loadingClass: 'loading',
            jsRoot: '/js/'
        }
    };

    function arrayContains(a, obj) {
        var i = a.length;
        while (i--) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    }

    var runOnce = false;
    return function(site) {
        if (runOnce) return;
        else runOnce = true;

        new Anysite(site);
    }
})(window, document);
