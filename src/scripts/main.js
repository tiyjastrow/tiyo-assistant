(function(tiy, $) {
    'use strict';

    // Public API methods
    tiy.loadModule = loadModule;

    // locals & constants
    let tiyoData = null;
    let navUI = null;
    let mainUI = null;
    let modulesLoaded = [];
    let dataLoaded = false;
    let uiLoaded = false;

    const MAIN_TEMPLATE = 'build/templates/main.html';
    const NAV_TEMPLATE = 'build/templates/nav.html';

    function main() {
        console.info('Initializing TIYO assistant');

        addFontAwesomeStyleSheet();

        collectData()
            .then(function getNavUI(data) {
                tiyoData = data;
                dataLoaded = true;
                console.log('Data gathered', data);
                return $.get(chrome.extension.getURL(NAV_TEMPLATE));
            })
            .then(function getMainUI(html) {
                navUI = $(html);
                $('.main .header:first').append(navUI);

                modulesLoaded.forEach(addNavIcon);
                navUI.on('click', 'li', showModuleUI);

                return $.get(chrome.extension.getURL(MAIN_TEMPLATE));
            })
            .then(function callModuleRenders(html) {
                mainUI = $(html);
                $('.breadcrumb').after(mainUI);
                uiLoaded = true;

                setupContentClose();

                console.log('UI base loaded, calling render methods', mainUI);
                modulesLoaded.forEach(function(mod) {
                    doRender(mod);
                });
            });
    }

    /**
     * Chrome extensions have issues with access files from css like fonts, so
     * we need to embed the styelsheet using the chromse extension URL, which
     * is dynamically generated. The remainder of the FA styles are in a static
     * stylesheet in /vendor
     */
    function addFontAwesomeStyleSheet() {
        $('head').append(
            $('<style>')
                .attr('type', 'text/css')
                .text(
                    `@font-face {
                        font-family: FontAwesome;
                        src: url('${chrome.extension.getURL('vendor/fontawesome-webfont.woff')}');
                    }`
                )
        );
    }

    function collectData() {
        let path = window.location.pathname.split(/\//),
            data = {
                path: null,
                group: null,
                students: []
            },
            group = $('.card-block dt:contains("Group")').next().find('a');

        if (path.length === 4 && path[2] === 'paths') {
            data.path = {
                id: Number(path[3]),
                title: $('.content .breadcrumb li:eq(1)').text()
            };
        }

        let p;
        if (group.length) {
            data.group = {
                title: group.text(),
                id: Number(group.attr('href').match(/\/([0-9]+)/)[1])
            };

            p = $.get(group.attr('href')).then(function(html) {
                let students = $(html).find('#students tr td:first-child a');
                students.each(function() {
                    let studentElem = $(this).find('.profile-placeholder-medium, img').remove().end();
                    data.students.push({
                        id: Number(studentElem.attr('href').match(/\/([0-9]+)/)[1]),
                        name: studentElem.text()
                    });
                });
                return data;
            });
        } else {
            p = Promise.resolve(data);
        }

        return p;
    }

    function addNavIcon(mod) {
        if (!navUI) { return; }

        navUI.find('ul').append(
            `<li data-module='${mod.name}'><i class='fa ${mod.navIcon} fa-lg' aria-hidden='true'></i></li>`
        );
    }

    function showModuleUI(e) {
        e.preventDefault();
        var name = $(this).data('module');
        var mod = modulesLoaded.filter(function(m) { return m.name === name;});
        if (!mod.length) { return; }

        console.log('showing ', mod[0]);
        $('.tiyo-assistant-module').hide();
        $(`[data-module="${mod[0].name}"]`).show().trigger('showing');
        mainUI.slideDown(1000);
    }

    function setupContentClose() {
        $('.tiyo-assistant-close').click(function closeContent(e) {
            e.preventDefault();
            mainUI.slideUp(1000);
        });
    }

    function loadModule(api) {
        if (!api) { return; }
        if (!api.name) { api.name = Date.getTime(); }

        console.info('loading module', api);

        modulesLoaded.push(api);

        addNavIcon(api);
        doRender(api);
    }

    function doRender(mod) {
        if (uiLoaded && typeof(mod.render) === 'function') {
            var elem = createModuleWrapper(mod);
            mod.render(tiyoData, elem);
        }
    }

    function createModuleWrapper(mod) {
        var elem = $(`<article data-module='${mod.name}'>`).addClass('tiyo-assistant-module');
        $(mainUI).find('.tiyo-assistant-content').append(elem);
        return elem;
    }

    // Kick things off...
    main();
    // Then export our module API
    window.tiy = tiy;
    console.log(window.tiy);

})(window.tiy || {}, window.jQuery);