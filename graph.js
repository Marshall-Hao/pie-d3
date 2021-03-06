const dims = { height: 300, width: 300, radius: 150 };
const cent = { x: (dims.width/2 + 5), y: (dims.height/2 + 5) };

const svg = d3.select('.canvas')
    .append('svg')
    .attr('width', dims.width + 150)
    .attr('height', dims.height + 150)

const graph = svg.append('g')
    .attr('transform',`translate(${cent.x}, ${cent.y})`);

const pie = d3.pie()
    .sort(null)   // no auto-sort
    .value(d => d.cost);

const angles = pie([
    { name: 'rent', cost: 500 },
    { name: 'bills', cost: 300 },
    { name: 'gaming', cost: 200 }
])

const arcPath = d3.arc()
    .outerRadius(dims.radius)
    .innerRadius(dims.radius / 2);

const colour = d3.scaleOrdinal(d3['schemeSet3']) // d3 build-in color scheme

// legend setup
const legendGroup = svg.append('g')
    .attr('transform', `translate(${dims.width + 40}, 10)`);

const legend = d3.legendColor()
    .shape('circle')
    .shapePadding(10)
    .scale(colour);

const tip = d3
    .select("body")
    .append("div")
    .attr("class", "card")
    .style("padding", "8px") // Add some padding so the tooltip content doesn't touch the border of the tooltip
    .style("position", "absolute") // Absolutely position the tooltip to the body. Later we'll use transform to adjust the position of the tooltip
    .style("left", 0)
    .style("top", 0)
    .style("visibility", "hidden");

// graph.call(tip)
//update function
const update = (data) => {

    // update colour scale domain
    colour.domain(data.map(d => d.name));
    
    // update and call legend
    legendGroup.call(legend);
    legendGroup.selectAll('text').attr('fill', 'white');


    // join enhanced (pie) data to path elements
    const paths = graph.selectAll('path')
        .data(pie(data));
    
    paths.exit()
        .transition().duration(750)
        .attrTween('d',arcTweenExit)
        .remove();

    paths.attr('d', arcPath)
        .transition().duration(750)
        .attrTween('d', arcTweenUpdate);
        

    paths.enter()
        .append('path')
            .attr('class', 'arc')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('fill', d => colour(d.data.name))
            .each(function(d){ this._current = d })
            .transition().duration(750)
                .attrTween("d", arcTweenEnter);
    
    // add events 
    graph.selectAll('path')
        .on('mouseover', handleMouseOver)
        .on('mouseout', handleMouseOut)
        .on('click', handleClick)
        .on('mousemove', (event) => {
            tip.style("transform", `translate(${event.pageX}px,${event.pageY}px)`); // We can calculate the mouse's position relative the whole page by using event.pageX and event.pageY.
          })

  
}
;
//data array and firestore
var data = [];
db.collection('expenses').onSnapshot(res => {

    res.docChanges().forEach(change => {
        
        const doc = {...change.doc.data(), id:change.doc.id };
        
        switch (change.type) {
            case 'added':
              data.push(doc);
              break;
            case 'modified':
              const index = data.findIndex(item => item.id == doc.id);
              data[index] = doc;
              break;
            case 'removed':
              data = data.filter(item => item.id !== doc.id);
              break;
            default:
              break;
          }
    });

    update(data);
});

const arcTweenEnter = (d) => {
    var i = d3.interpolate(d.endAngle, d.startAngle);

    return (t) => {
        d.startAngle = i(t);
        return arcPath(d);
    }
}

const arcTweenExit = (d) => {
    var i = d3.interpolate(d.startAngle, d.endAngle);

    return (t) => {
        d.startAngle = i(t);
        return arcPath(d);
    }
}

// use function keyword to allow use of 'this'
function arcTweenUpdate(d)  {

  //interpolate between the two objects
  var i = d3.interpolate(this._current, d);  //i - t 
  // update the current prop with new updated data 
  this._current = i(1)

  return function(t) {
      return arcPath(i(t));
  }

}

// event handles
const handleMouseOver = (event, d) => {
    //console.log(event.currentTarget);
    let content = `<div class="name">${d.data.name}</div>`;
      content += `<div class="cost">??${d.data.cost}</div>`;
      content += `<div class="delete">Click slice to delete</div>`;
      tip.html(content).style("visibility", "visible");
    d3.select(event.currentTarget)
        .transition('changeSlicefill') // give transition name doesnt affect other transition
        .duration(300)
        .attr("fill", "#fff");
  };

const handleMouseOut = (event, d) => {
    //console.log(event.currentTarget);
    tip.style("visibility", "hidden");
    d3.select(event.currentTarget)
        .transition('changeSlicefill')
        .duration(300)
            .attr("fill", colour(d.data.name));
  };

  const handleClick = (event, d) => {
    const id = d.data.id;
    db.collection("expenses").doc(id).delete();
  };