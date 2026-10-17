/**
 * Local-only optional comparison form.
 * Author: agent-02 (AI agent). No fetch, cookies, storage or auto-submission.
 */
import { PAIRS, orderedGames, buildComparison, comparisonFilename } from "./pairs.mjs";

const $ = id => document.getElementById(id);
const form = $("comparison"), preview = $("preview"), status = $("status");
const requested = new URLSearchParams(location.search).get("pair");
if(requested && Object.hasOwn(PAIRS,requested)) $("pair").value=requested;

function regenerate(){
  const answers=Object.fromEntries(new FormData(form));
  const games=orderedGames(answers.pair,answers.order);
  for(const [i,suffix] of ["a","b"].entries()){
    const game=games?.[i];
    $("title-"+suffix).textContent=game ? game.name : "Choose a pair first";
    $("credit-"+suffix).textContent=game ? game.type + " · " + game.author : "No game chosen.";
    const link=$("link-"+suffix);
    if(game){
      // Paths are static, reviewed catalog entries, never user-input URLs.
      link.href="../../"+game.path;
      link.textContent="Open "+game.name+" in a new tab ↗";
      link.hidden=false;
    }else{
      link.hidden=true;
      link.removeAttribute("href");
    }
  }
  const canCompare=Boolean(games)&&answers.played==="both";
  $("after-both").hidden=!canCompare;
  if(!canCompare)$("after-both").open=false;
  preview.value=buildComparison(answers);
  status.textContent="";
}
// A/B notes must not silently transfer to a different experiment or order.
let previousPair=$("pair").value;
let previousOrder=$("order").value;
const GAME_NOTES=["notesA","notesB","returnChoice","difference","friction","versionOriginal","versionVariant"];
function updateContext(){
  const nextPair=$("pair").value, nextOrder=$("order").value;
  const changed=nextPair!==previousPair||nextOrder!==previousOrder;
  if(changed && (GAME_NOTES.some(id=>$(id).value.trim()) ||
      $("played").value!=="not-recorded")){
    const approved=window.confirm(
      "Changing the pair or order will clear notes about experiences A and B, " +
      "so they cannot be attributed to the wrong games. Continue?"
    );
    if(!approved){
      $("pair").value=previousPair;
      $("order").value=previousOrder;
      regenerate();
      return;
    }
    for(const id of GAME_NOTES)$(id).value="";
    $("played").value="not-recorded";
    $("after-both").open=false;
  }
  if(changed) {
    // Even without typed notes, a prior played-both flag must not carry over.
    $("played").value="not-recorded";
    for(const id of GAME_NOTES)$(id).value="";
    $("after-both").open=false;
  }
  previousPair=$("pair").value;
  previousOrder=$("order").value;
  regenerate();
}
form.addEventListener("input",event=>{
  if(event.target.id==="pair"||event.target.id==="order")return;
  regenerate();
});
form.addEventListener("change",event=>{
  if(event.target.id==="pair"||event.target.id==="order")updateContext();
  else regenerate();
});
form.addEventListener("submit",event=>event.preventDefault());
$("copy").addEventListener("click",async()=>{
  if(!navigator.clipboard?.writeText){
    preview.focus();preview.select();
    status.textContent="Clipboard unavailable. Select and copy the report manually.";
    return;
  }
  try{
    await navigator.clipboard.writeText(preview.value);
    status.textContent="Copied locally. Nothing was submitted.";
  }catch{
    preview.focus();preview.select();
    status.textContent="Clipboard permission unavailable. Report selected for manual copy.";
  }
});
$("download").addEventListener("click",()=>{
  const file=new Blob([preview.value],{type:"text/markdown;charset=utf-8"});
  const url=URL.createObjectURL(file);
  const a=document.createElement("a");
  a.href=url;
  a.download=comparisonFilename($("pair").value);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent="Local Markdown download requested. Nothing was submitted.";
});
regenerate();
