var mousex = 0,
    mousey = 0,
    tops = 0,
    left = 0,
    on = false;

function createmap(players){
    function iftooclose(posx, posy, poslist, maxdistance) { 
        var flag = false;
        poslist.forEach(i => {
            if ((posx - i[0]) ** 2 + (posy - i[1]) ** 2 < maxdistance ** 2){
                flag = true;
            }
        });
        return flag;
    }

    var maplist = new Array();
    var mapx = Math.floor(players**0.5*8) + 5 + Math.floor(Math.random() * 3),
        mapy = Math.floor(players**0.5*8) + 5 + Math.floor(Math.random() * 3);
    var mapsize = new Array(mapx, mapy);

    for (var i = 0; i < mapy; i++ ){
        maplist[i] = new Array;
        for (var j = 0; j < mapx; j++){
            maplist[i][j] = 1;
        }
    }

    for (var i = 0; i < mapy * 2; i++){
        var movex = Math.floor(Math.random() * mapx),
            movey = Math.floor(Math.random() * mapy);
        for (var j = 0; j < mapx; j++){
            maplist[movey][movex] = 0;
            var flag = Math.random();
            if (flag < 0.25){
                movex++;
            } else if (flag < 0.50){
                movex += mapx -1;
            } else if (flag < 0.75){
                movey ++;
            } else {
                movey += mapy - 1;
            }
            movex %= mapx;
            movey %= mapy;
        }
    }

    var towers = new Array();
    for (var i = 0; i < players * 3; i++){
        var towerx = Math.floor(Math.random() * mapx),
            towery = Math.floor(Math.random() * mapy);
        towers[i] = new Array(towerx, towery);
        maplist[towery][towerx] = 1;
    }

    var generals = new Array();
    for (var i = 0; i < players; i++){
        var generalx = Math.floor(Math.random() * mapx),
            generaly = Math.floor(Math.random() * mapy);
        while (iftooclose(generalx, generaly, generals, 7) || maplist[generaly][generalx] == 1 || towers.indexOf(new Array(generalx, generaly)) != -1){
            generalx = Math.floor(Math.random() * mapx);
            generaly = Math.floor(Math.random() * mapy);
        }
        generals[i] = new Array(generalx, generaly);
    }

    return [mapsize, maplist, generals, towers];
}

$(document).ready(function() {
    var size = 50;
    window.addEventListener("wheel", function(e) {
        let evt = e || window.event;
        evt.preventDefault();
        if (evt.deltaY > 0) {
            if (size > 20) {
                size -= 5;
            }
        } else {
            if (size < 100) {
                size += 5;
            }
        }
        $("#playmap td").css({
            "width": size + "px",
            "height": size + "px",
            "min-width": size + "px",
            "min-height": size + "px",
            "max-width": size + "px",
            "max-height": size + "px",
            "font-size": size * 0.3 + "px",
            "background-size": size * 0.8 + "px " + size * 0.8 + "px"
        });
        $("#playmap td div").css("line-height", size + "px");
    }, {
        passive: false
    });

    var mapls = createmap(13);

    console.log(mapls);

    var mapsize, map, generals, towers;
    mapsize = mapls[0];
    map = mapls[1];
    generals = mapls[2];
    towers = mapls[3];
    var width = mapsize[0];
    var height = mapsize[1];

    map = eval(map);

    playerlist = eval(generals);

    var cw = document.body.clientWidth,
        ch = document.body.clientHeight;
    console.log(cw, ch);
    var w = (size + 4) * width,
        h = (size + 4) * height;
    tops = (ch - h) / 2;
    left = (cw - w) / 2;
    $("#playmap").css({
        "top": tops + "px",
        "left": left + "px"
    });

    for (var i = 0; i < height; i++) {
        var tr = $("<tr></tr>");
        $("#playmap tbody").append(tr);
    }
    for (var i = 0; i < width; i++) {
        var td = $("<td><div></div></td>");
        $("#playmap tbody tr").append(td);
    }
    var maps = $("#playmap tbody td");
    var mapdiv = $("#playmap tbody td div");
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            if (map[i][j] == 1) {
                maps.eq(width * i + j).addClass("mountain");
            } else {
                maps.eq(width * i + j).addClass("teal");
            }
        }
    }
    var colors = ["red", "green", "lightblue", "purple", "teal", "blue", "orange", "maroon", "gold", "pink", "brown", "lightgreen", "purpleblue"];
    console.log(playerlist);
    for (var i = 0; i < playerlist.length; i++) {
        x = playerlist[i][0];
        y = playerlist[i][1];
        maps.eq(width * y + x).addClass(colors[i]).addClass("general");
        mapdiv.eq(width * y + x).text(40);
    }

    for (var i = 0; i < towers.length; i++){
        x = towers[i][0];
        y = towers[i][1];
        t = 40 + Math.floor(Math.random() * 11);
        maps.eq(width * y + x).addClass("city");
        mapdiv.eq(width * y + x).text(t);
    }

    $(document).mousedown(function(e) {
        mousex = e.pageX;
        mousey = e.pageY;
        on = true;
    });
    $(document).mouseup(function() {
        on = false;
    });
    $(document).mousemove(function(e) {
        if (on) {
            left += e.pageX - mousex;
            tops += e.pageY - mousey;
            mousex = e.pageX;
            mousey = e.pageY;
            $("#playmap").css({
                "top": tops + "px",
                "left": left + "px"
            });
        }
    });
    $("#playmap tbody td:not(.teal)").click(function(e) {
        e.preventDefault();
        $("#playmap tbody .selected").removeClass("selected");
        $("#playmap tbody .moveable").removeClass("moveable");
    });
    $(".teal").click(function(e) {e.preventDefault();
        $("#playmap tbody .selected").removeClass("selected");
        $("#playmap tbody .moveable").removeClass("moveable");
        $(this).addClass("selected");
        var x, y;
        x = maps.index(this)%width;
        y = Math.floor(maps.index(this)/width);
        if (0 <= y-1){
            maps.eq(width*(y-1)+x).addClass("moveable");
            maps.eq(width*(y-1)+x).attr("data-direction", 1);
        }
        if (y+1 < height){
            maps.eq(width*(y+1)+x).addClass("moveable");
            maps.eq(width*(y+1)+x).attr("data-direction", 2);
        }
        if (0 <= x-1){
            maps.eq(width*y+x-1).addClass("moveable");
            maps.eq(width*y+x-1).attr("data-direction", 3);
        }
        if (x+1 < width){
            maps.eq(width*y+x+1).addClass("moveable");
            maps.eq(width*y+x+1).attr("data-direction", 4);
        }
    });
});