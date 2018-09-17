

 $(function(){
     chrome.storage.sync.get(['rules'], function(result) {
         console.log('loading rules');
         console.log(result);
         try {
             var rules=JSON.parse(result.rules);
             ExWakaTimeConfig.init(rules);

         }catch($e ){
             ExWakaTimeConfig.init([]);
         }

     });

     chrome.storage.sync.get(['apiKey'], function(result) {
         try {
             if(result.apiKey==''){
             }else{
                 ExWakaTimeConfig.apiKey=result.apiKey;
                 $("#api-key-config input[name='secret_api_key']").val(result.apiKey);

             }
             // ExWakaTime.auth();
         }catch($e ){
         }


     });

 });


var ExWakaTimeConfig={
    apiKey:'',
    rules:null,
    bind:function(){

      $("#add_row").on("click",function(){
          console.log("trying to add ");
          $("#save_data").removeClass('disabled');
          ExWakaTimeConfig.addRule();
      });
      $("#save_data").on("click",function(){
          console.log("trying to save ");
          ExWakaTimeConfig.save();
      });

      $("#api-key-config .btn-primary").on("click",function(){
          $("#api-key-config").modal('hide') ;
          var apiKey=$("#api-key-config input[type='password']").val();
          ExWakaTimeConfig.apiKey=apiKey;
          chrome.storage.sync.set({apiKey: apiKey}, function() {
              console.log('Сохраняем ключь API ');
              chrome.runtime.sendMessage({method: "reloadApiKey"}, function(response) {});
          });
      });


    },
    bindrow:function(i){
        var $tr=$("tr[data-storage-key='"+i+"']");

        $tr.find("input[name='rule'], input[name='project']").on("keyup",function(){
            $("#save_data").removeClass('disabled');
            var $tr=$(this).closest('tr');
            var i=$tr.attr('data-storage-key');
            ExWakaTimeConfig.rules[i]={
                rule:$tr.find("input[name='rule']").val(),
                project:$tr.find("input[name='project']").val()
            }

        });


        $tr.find('button.btn-danger').on("click",function(){

            var $tr=$(this).closest('tr');
            var i=$tr.attr('data-storage-key');
            if(window.confirm("Вы уверены что хотите удалить это правило ?")){
                ExWakaTimeConfig.rules.splice(i,1);
                ExWakaTimeConfig.save();
                    document.location.reload();

            }

        });
    },
    init:function(rules){
        this.bind();
        this.rules=rules;
        var $tr=$("tr.row-example").clone();
        var $table=$('table:eq(0)');
        $tr.attr("style","").attr("class","");
            $.each(rules,function(i,val){
                var nrow=$tr.clone();
                nrow.attr("data-storage-key",i);
                nrow.find("input[name='rule']").val(val.rule);
                nrow.find("input[name='project']").val(val.project);
                $table.prepend(nrow);
                ExWakaTimeConfig.bindrow(i);
            });
    },
    addRule:function(){
        var i=this.rules.push({'rule':'',"project":''})-1;
        var $tr=$("tr.row-example").clone();
        $tr.attr("style","").attr("class","");
        var $table=$('table:eq(0)');
        var nrow=$tr.clone();
        nrow.attr("data-storage-key",i);
        $table.find('tbody').prepend(nrow);
        ExWakaTimeConfig.bindrow(i);
    },


    save:function(){
        chrome.storage.sync.set({rules: JSON.stringify(ExWakaTimeConfig.rules)}, function() {
            console.log('Сохраняем правила ');
            $("#save_data").addClass('disabled');
            // ExWakaTime.reloadRules();
            chrome.runtime.sendMessage({method: "reload"}, function(response) {});
        });

    }



}