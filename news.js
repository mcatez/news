/*!
 * news v0.5.6, a JavaScript notification library
 * Copyright (C) 2011 Manuel Catez
 * 
 * Distributed under an MIT-style license
 * See https://github.com/mcatez/news
 */
var news = { version: '0.5.6' };
(function() {
    
    var news = this.news,
        reSubscribe = /^([a-z0-9_-]+)(@[a-z0-9_-]+)?(>(?:\*|[^>\n\r\f\t]+))$/i,
        reUnsubscribe = /^(\*|[a-z0-9_-]+)(@(?:\*|[a-z0-9_-]+))?(>(?:\*|[^>\n\r\f\t]+))$/i,
        oReg = {},
        Notification,
        subscribe,
        subscribeAll,
        unsubscribe,
        unsubscribeAll,
        publish,
        removeHandlersMain,
        removeHandlers,
        execHandlers;
    
    Notification = function(oDatas) {
        this.type = oDatas.type;
        this.label = oDatas.label;
        this.propagation = (oDatas.propagation !== false);
        this.stopped = false;
        this.prevented = false;
        this.source = oDatas.source || null;
        this.data = oDatas.data || {};
        this.timeStamp = (new Date()).getTime();
    };
    Notification.prototype = {
        stopPropagation: function(bNow) {
            this.propagation = false;
        },
        
        stopImmediatePropagation: function() {
            this.propagation = false;
            this.stopped = true;
        },
        
        preventDefault: function() {
            this.prevented = true;
        }
    };
    
    subscribe = function(sNews, fHandler, oContext) {
        var aTokens = sNews.match(reSubscribe);
        if(aTokens) {
            var sType = aTokens[1],
                sNamespace = aTokens[2] || '@!',
                sLabel = aTokens[3],
                oData = { handler: fHandler, ns: sNamespace, context: oContext },
                oType = oReg[sType],
                oActions;
            if(!oType) {
                oType = oReg[sType] = { count: 0 };
            }
            oActions = oType[sLabel];
            if(oActions) {
                oActions[oActions.length] = oData;
            } else {
                oType[sLabel] = [ oData ];
            }
            oType.count++;
        } else {
            publish({
                type: 'error',
                label: 'news.subscribe',
                data: { message: 'Incorrect news name: ' + sNews }
            });
        }
    };
    
    subscribeAll = function() {
        var sType = typeof arguments[0],
            i, l, oDatas;
        if(sType === 'string') {
            subscribe(arguments[0], arguments[1], arguments[2]);
        } else if(sType === 'object' && arguments[0]) {
            i = -1;
            l = arguments.length;
            while(++i < l) {
                oDatas = arguments[i];
                console.log(oDatas);
                subscribe(oDatas.name, oDatas.handler, oDatas.context);
            }
        }
    };
    
    removeHandlersMain = function(oType, sLabel, sNamespace) {
        var aLabel = oType[sLabel];
        if(aLabel) {
            if(sNamespace === '@?') {
                delete oType[sLabel];
                oType.count--;
                return;
            }
            var i = aLabel.length;
            if(sNamespace === '@*') {
                while(i--) {
                    if(aLabel[i].ns !== '@!') {
                        aLabel.splice(i, i + 1);
                    }
                }
            } else {
                while(i--) {
                    if(aLabel[i].ns === sNamespace) {
                        aLabel.splice(i, 1);
                    }
                }
            }
            if(aLabel.length === 0) {
                delete oType[sLabel];
                oType.count--;
            }
        }
    };
    
    removeHandlers = function(sType, sLabel, sNamespace) {
        var oType = oReg[sType];
        if(oType) {
            if(sLabel === '>*') {
                var sName;
                for(sName in oType) {
                    if(oType.hasOwnProperty(sName) && sName !== 'count') {
                        removeHandlersMain(oType, sName, sNamespace);
                    }
                }
            } else {
                removeHandlersMain(oType, sLabel, sNamespace);
            }
            if(oType.count === 0) {
                delete oReg[sType];
            }
        }
    };
    
    unsubscribe = function(sNews) {
        if(sNews === '*' || sNews === '*@?>*') {
            oReg = {};
        } else {
            var aTokens = sNews.match(reUnsubscribe);
            if(aTokens) {
                var sType = aTokens[1],
                    sNamespace = aTokens[2] || '@!',
                    sLabel = aTokens[3];
                if(sType === '*') {
                    for(sType in oReg) {
                        if(oReg.hasOwnProperty(sType)) {
                            removeHandlers(sType, sLabel, sNamespace);
                        }
                    }
                } else {
                    removeHandlers(sType, sLabel, sNamespace);
                }
            } else {
                publish({
                    type: 'error',
                    label: 'news.unsubscribe',
                    data: { message: 'Incorrect news name: ' + sNews }
                });
            }
        }
    };
    
    unsubscribeAll = function() {
        var i = arguments.length;
        while(i--) {
            unsubscribe(arguments[i]);
        }
    };
    
    execHandlers = function(oNews, aReg) {
        if(aReg) {
            var i = -1,
                l = aReg.length,
                oListener;
            while(++i < l) {
                oListener = aReg[i];
                oListener.handler.call(oListener.context || oNews.source || null, oNews);
                if(oNews.stopped === true) {
                    break;
                }
            }
        }
    };
    
    publish = function(oDatas) {
        var oType = oReg[oDatas.type];
        if(oType) {
            var sLabel = '>' + oDatas.label,
                oNews = new Notification(oDatas),
                aParts, i;
            if(oNews.propagation === false) {
                execHandlers(oNews, oType[sLabel]);
            } else {
                aParts = sLabel.split('.');
                i = aParts.length;
                while(i--) {
                    sLabel = aParts.slice(0, i + 1).join('.');
                    execHandlers(oNews, oType[sLabel]);
                    if(oNews.propagation === false || oNews.stopped === true) {
                        break;
                    }
                }
                if(oNews.propagation !== false && oType['>*']) {
                    execHandlers(oNews, oType['>*']);
                }
            }
            return (oNews.prevented !== true);
        }
        return true;
    };
    
    news.subscribe = subscribeAll;
    news.unsubscribe = unsubscribeAll;
    news.publish = publish;
    
}());