
function Mod (i,j) {
	return i%j;
}

Object.defineProperty(Array.prototype,'last',{
	get:function(){
		return this[this.length-1]
	}
})

String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.split(search).join(replacement);
}

Array.prototype.pop = function(index){
    if(index==null){
        index = this.length - 1;
    }
    return this.splice(index,1)[0];   
}		

function id (s) {
	return document.getElementById(s)
}



window.DEBUG = false;

function Artiz( pageName , jsonObject , jsonObjectGlobal ){

	var artizScript = Artiz.pages[pageName]
	if(artizScript==null)
		console.warn("Artiz.pages don't contains",pageName)
	
	let ttoElement = this;

	/*
		foreachKeys -> {$$category , $$page }
	*/
	
	this.foreachKeys = {};

	// İç içe geçmiş sayfa elemanları için geçerli bir durum
	this.complieLines = function(
									lines ,
									globalObj , 
									obj , 
									parent ,
									start , 
									kill_min_indent
								) {


		if(start==null) start = 0;
		if(kill_min_indent==null) kill_min_indent = -1;
		if(obj==null) obj = globalObj;
		
		var elStack = [];
		if(parent == null)
			elStack = [ {obj:obj,indent:0 ,el :Crel("") } ]; 
		else 
			elStack = [ {obj:obj,indent:0 ,el :parent } ]; 

		var go_indent = Infinity;

		for( var i = start  ;i < lines.length; i++ ){
			Artiz.lastLine = i;
			Artiz.lastLineText = lines[i].line.trim();

			var line = lines[i].line , indent = lines[i].indent ;
			
			if(indent<=kill_min_indent)
				break;
			if(indent>go_indent)
				continue;
			else
				go_indent = Infinity;

			if(DEBUG) console.log("line",line,  indent)

			while( elStack.last.indent >= indent ){
				elStack.pop();
				//console.log('elStack pop')
			}

			
			// FOR EACH
			if(line.trim().startsWith('::')){
				var data = line.trim().substr(2);
				if(DEBUG) console.log("foreach:",data,elStack.last.obj[data])
				for(var j = 0 in elStack.last.obj[data]){

					if(j!="$" && j!="$$"){
						if(DEBUG) console.log("×××", j , elStack.last.obj[data][j])
						ttoElement.foreachKeys[data] = j;
						ttoElement.complieLines( 
							lines , 
							globalObj,
							Object.assign(
								elStack.last.obj[data][j],
								{"$$":j,"$":elStack.last.obj[data][j]}
							),
							elStack.last.el,
							i+1 ,
							indent  
						);

					}
					
				}
				go_indent = indent;

			// Artiz OTHER Artiz
			}else if(line.trim().startsWith('->')){
				var data = line.trim().substr(2);
				if(Artiz.pages[data]!=null){
					elStack.last.el.appendChild(Artiz( data , elStack.last.obj , globalObj ) )
				}else{
					console.warn("Artiz.pages["+data+"] not found.\nLine:",Artiz.lastLineText);
				}
				
			// Artiz OTHER ID
			}else if(line.trim().startsWith(':#')){
				var data = line.trim().substr(2);
				var elid = document.getElementById(data);
				while(elid.children.length>0){
					elid.removeChild(elid.firstElementChild)
				}

				if( elid!=null ){

					ttoElement.complieLines( 
						lines , 
						globalObj,
						elStack.last.obj,
						elid,
						i+1 ,
						indent  
					);					
				}else{
					console.warn("Artiz: '"+data+"' id element not found.\nLine:",line);
				}
				go_indent = indent;
			
			// IF IN
			}else if(line.trim().startsWith(':?')){
				var data = line.trim().substr(2);
				// ŞARTLANDIRMA
				if(Artiz.localEval(data,elStack.last.obj,globalObj)){

				}else{
					go_indent = indent;
				}/*
				elStack.push( { 
					obj: Object.assign(
							elStack.last.obj[data],
							{"$$":data,"$":elStack.last.obj[data]}
						),  
					indent : indent  ,
					el :elStack.last.el  } );
				*/
			
			// IN
			}else if(line.trim().startsWith(':')){
				var data = line.trim().substr(1);
				elStack.push( { 
					obj: Object.assign(
							elStack.last.obj[data],
							{"$$":data,"$":elStack.last.obj[data]}
						),  
					indent : indent  ,
					el :elStack.last.el  } );

			}else if(line!=""){
				var el  = Crel(
							line.trim(),
							elStack.last.obj , 
							globalObj , 
							ttoElement.foreachKeys 
						);

				elStack.last.el.appendChild(el)
				elStack.push( { 
					obj: elStack.last.obj , 
					indent : indent  ,
					el :el  } 
				);

			}
		}

		if(elStack[0].el.children.length==1)
			return elStack[0].el.firstChild
		else
			return elStack[0].el;

	}
	

	var lines = Artiz.convertIndent(artizScript);
	if(jsonObject==null) jsonObject ={}
	jsonObject["$"] = jsonObject;
	
	if(Artiz.preProcess[pageName])
		Artiz.preProcess[pageName](jsonObject);
	

	if(jsonObjectGlobal==null) jsonObjectGlobal = jsonObject;

	return this.complieLines(lines,jsonObjectGlobal,jsonObject)

}



/* 
	*------------VARIABLES ----------------
	* defaultIndentLength = 2;
	* lastLine -> int
	* lastLineText -> (String)
	* pages -> ( Array  (String)  ) 
	* preProcess ( Object (Function))
	*------------FUNCTIONS -----------------
	* indentCount   ->  (String) line to int
	* convertIndent ->  (String) lines to (Object) {line:(String),indent:(int)}
	* buildAllArtizScript			
	* lovalEval



       *
      * *     % işaretini :? kısmında kullanılmamalıdır bunun yerine Mod(x,y) kullanılmalıdır
     * | *
	*_____*
*/

Artiz.defaultIndentLength = 2;
Artiz.lastLine = 0; 
Artiz.lastLineText = ""; 
Artiz.pages = [];
Artiz.preProcess = {};

Artiz.complie = function(code,obj){
	//var lines = Artiz.convertIndent(code);
	if(obj==null) obj ={}
	obj["$"] = obj;
	Artiz.pages.test = code;
	return Artiz("test",obj,obj)

}

Artiz.localEval = function(code,obj,globalObj){
	
	code = code.replaceAll("$$",obj["$$"]);
	code = code.replaceAll("$","obj.");
	code = code.replaceAll("%","globalObj.");
	var e = eval(code); 
	return e;
}


Artiz.indentCount = function(line) {
	var defIndentLen = Artiz.defaultIndentLength;
	var i = 0,j=0;
	for( i  = 0 ; i< line.length ;i++){
		if(line[i]=='\t') j+=defIndentLen;
		else if(line[i]==" ") j+=1;
		else break;

	}
	return j/defIndentLen;
}


Artiz.convertIndent = function(lines){
	var line = lines.split('\n') ,arr = [];
	for(var i = 0;i<line.length;i++){
		if(line[i].trim()!=""){
			arr.push({ line: line[i] , indent: Artiz.indentCount(line[i]) +1  })
		}
	}
	return arr;
}


function sendGet(url,handle,error){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function(){
		//console.log(this.readyState , this.status)
		if(this.readyState==4 && this.status == 200){
			handle(this.responseText)
		}else{
			if (error)error(this.responseText)
		}
	}
	xhttp.open("GET",url,true);
	xhttp.send();
}

Artiz.buildScript = function(src,handle){
	sendGet( src , function(lines){
 		handle ( Artiz(lines) ) ;
	} )
}

Artiz.buildAllArtizScript = function(){

}




//window.foreachKeys = {};

//document.body.appendChild(run());
function run(){
	console.clear()
	var artizScript = id("artiz_script").innerText;	
	//var jsonObject  = JSON.parse(id("json").innerText)
	eval("jsonObject = "+ id('json').innerText);

	// lines -> [{line:'str',indent:int}] dönüşümü

	//console.log(x,jsonObject)
	var retArtiz = Artiz( artizScript ,jsonObject );	
	//console.log(retArtiz)
	console.log(retArtiz.outerHTML.replaceAll(">","\n"))
	return retArtiz
}






//##################### CREL OBJECT #############33


Object.getChildValue = function(obj,arr,defaultValue){
	if(defaultValue==null)
		defaultValue=""
	if(obj==null){
		console.warn("Object has not '"+arr[0]+"' key.\n JSON OBJECT:",obj,
			"\nLine Number:",Artiz.lastLine,"\nLine:",Artiz.lastLineText)
		return defaultValue;
	}
	if(arr.length==0){
		return obj;
	}else {
		var index = arr.pop(0);
		if( typeof(obj) =="object" &&  index in obj ){
			return Object.getChildValue(obj[index],arr,defaultValue)
		}else{
			// ALERT Line belirt
			console.warn("Object has not '"+index+"' key.\n JSON OBJECT:",obj,
				"\nLine Number:",Artiz.lastLine,"\nLine:",Artiz.lastLineText)
			return "";
		}
	}
}

// "" tırnak işaretlerini siler
String.prototype.trimQuotes = function(){
	str = this;
	str = str.trim();
	if(str[0]=="\"" || str[0] == "'" )
		str = str.substr(1)
	if(str[str.length-1]=="\"" || str[str.length-1] == "'" )
		str = str.substr(0,str.length-1)
	return str;
};


function CrelNs(script,obj){
	return Crel(script,obj,obj,null,true);
}

function Crel (script,obj,globalObj,foreachKeys,isNs) {
	// tag#id.class[attr]>insideText$data
	var ret = {}


	ret.tagName = script.match(/^([^\#\.\[\>]*)/)[0];
	if(ret.tagName=="") ret.tagName = "div";

	ret.id        = script.match(/\#([^\.\#\[\>]*)/gi)
		ret.classList = script.match(/\.([^\.\#\[\>]*)/gi)
	ret.attrList  = script.match(/\[([^\]]*)\]/gi)
	ret.html      = script.match(/\>(.*)$/gi)
	
	if(ret.id!=null) ret.id= ret.id[0];

	var retEl 
	if(isNs==true)
		retEl = document.createElementNS( "http://www.w3.org/2000/svg" , ret.tagName );
	else
		retEl = document.createElement(ret.tagName);
		
	
	if ( ret.id !=null )
		retEl.setAttribute("id", ret.id.replace("#", "") ) 

	if(ret.classList!=null)
		for(var i = 0 ; i< ret.classList.length ; i++){
			retEl.classList.add( ret.classList[i].replace(".", "") );
		}
	if(ret.attrList!=null)
		for(var i = 0 ; i< ret.attrList.length ; i++){
			var to = ret.attrList[i].replace("[", "").replace("]","").split("=");
			//retEl.setAttribute(to[0], Crel.CrelReplace(to[1],obj) )
			retEl.setAttribute(to[0], Crel.ReplaceDollar( to[1] , obj,globalObj,foreachKeys ) )
			
			
		}

	if(ret.html!=null){
		ret.html = Crel.ReplaceDollar(ret.html[0].substr(1) , obj,globalObj,foreachKeys )
		//ret.html = Crel.CrelReplaceGlobal(ret.html[0].substr(1),globalObj );
		//ret.html = Crel.CrelReplace(ret.html,obj , foreachKeys);
		
	}
	retEl.innerHTML = ret.html;

	return retEl;
}
/*
	#########
	#
	#########
	#
	#########

	replaceİşlemi sırasında akıllı ekleme sistemi ekle örneğin split yap replacementleri
	dizi üzerine ekleme yap
	
	ALERT:: [] arasındaki elementler için global replace yok!
*/

Crel.ReplaceDollar = function(str,obj,globalObj,foreachKeys){
	var ret = Crel.CrelReplaceGlobal(str,globalObj);
	return  Crel.CrelReplace(ret,obj,foreachKeys)
}

Crel.CrelReplace = function(str,obj,foreachKeys) {
	var replacement = str.match(/\$([^ ]*)/gi)
	
	if(replacement!=null)
		for(var i = 0 ; i< replacement.length;i++){
			if(DEBUG) console.log("---",obj)
			var data = replacement[i].substr(1).trimQuotes();
			
			if (replacement[i]=="$" || replacement[i]=="$$"){
				str= str.replace(replacement[i] ,obj[replacement[i] ] );
				if(DEBUG) console.log("--",obj[replacement[i]])
			}else if( replacement[i].startsWith("$$") ){
				str= str.replace(replacement[i] , foreachKeys[data.substr(1)] )
			}else {
				str= str.replace(replacement[i] , Object.getChildValue( obj, data.split('$') ) )
				if(DEBUG) console.log("--",obj[replacement[i].substr(1)])
			}
		}
	return str;			
}

Crel.CrelReplaceGlobal = function (str,obj) {
	var replacement = str.match(/\%([^ ;][^ ]*)/gi)
	
	if(replacement!=null)
		for(var i = 0 ; i< replacement.length;i++){
			if(DEBUG) console.log("---",obj)
			var data = replacement[i].substr(1).trimQuotes();

			str= str.replace(replacement[i] , Object.getChildValue( obj, data.split('$') ) )
			if(DEBUG) console.log("--",obj[replacement[i].substr(1)])
			
		}
	return str;			
}
