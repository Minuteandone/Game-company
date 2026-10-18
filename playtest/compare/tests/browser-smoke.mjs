/**
 * Test the optional side-by-side worksheet over real localhost HTTP.
 * Author: agent-02 (AI agent). Synthetic content only, no submissions.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PAIRS } from "../pairs.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const MIME={".html":"text/html;charset=utf-8",".mjs":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8"};

async function start(){
  const server=http.createServer(async(request,response)=>{
    try{
      const url=new URL(request.url||"/","http://localhost");
      const requested=url.pathname.endsWith("/")?url.pathname+"index.html":url.pathname;
      const absolute=path.resolve(ROOT,"."+decodeURIComponent(requested));
      if(!absolute.startsWith(ROOT+path.sep)){
        response.writeHead(403).end("Forbidden");return;
      }
      const bytes=await readFile(absolute);
      response.writeHead(200,{"content-type":MIME[path.extname(absolute)]||"application/octet-stream"}).end(bytes);
    }catch{response.writeHead(404).end("Not found");}
  });
  await new Promise((resolve,reject)=>{
    server.once("error",reject);server.listen(0,"127.0.0.1",resolve);
  });
  return {server,url:"http://127.0.0.1:"+server.address().port+"/playtest/compare/"};
}

test("comparison: neutral, reversed order, local-only export and 320px access", async()=>{
  const {server,url}=await start();
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({
      viewport:{width:1100,height:800},reducedMotion:"reduce",acceptDownloads:true
    });
    const page=await context.newPage();
    const errors=[],outbound=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("console",e=>{if(e.type()==="error")errors.push(e.text());});
    await page.route("**/*",route=>{
      const req=route.request();
      if(req.method()!=="GET"||!req.url().startsWith("http://127.0.0.1:"+server.address().port+"/")){
        outbound.push(req.method()+" "+req.url());return route.abort();
      }
      return route.continue();
    });
    assert.equal((await page.goto(url)).status(),200);
    assert.match(await page.title(),/Compare Two Experiences/);
    assert.equal(await page.locator("#pair").inputValue(),"");
    assert.equal(await page.locator("#link-a").getAttribute("href"),null);
    assert.equal(await page.locator("#link-b").getAttribute("href"),null);
    assert.equal(await page.locator("#link-a").isHidden(),true);
    assert.equal(await page.locator("#after-both").getAttribute("open"),null);
    assert.match(await page.locator("#preview").inputValue(),/Unspecified comparison/);

    for(const [key,record] of Object.entries(PAIRS)){
      await page.locator("#pair").selectOption(key);
      assert.equal(await page.locator("#title-a").textContent(),record.original.name);
      assert.equal(await page.locator("#title-b").textContent(),record.variant.name);
      assert.equal(await page.locator("#link-a").getAttribute("href"),"../../"+record.original.path);
      assert.equal(await page.locator("#link-b").getAttribute("href"),"../../"+record.variant.path);
      assert.equal(await page.locator("#link-a").getAttribute("rel"),"noopener noreferrer");
      assert.ok((await page.locator("#preview").inputValue()).includes(record.original.author));
      assert.ok((await page.locator("#preview").inputValue()).includes(record.variant.author));
      await page.locator("#order").selectOption("variant-first");
      assert.equal(await page.locator("#title-a").textContent(),record.variant.name);
      assert.equal(await page.locator("#title-b").textContent(),record.original.name);
      assert.equal(await page.locator("#link-a").getAttribute("href"),"../../"+record.variant.path);
      await page.locator("#order").selectOption("original-first");
    }

    await page.goto(url+"?pair=prism-fork");
    assert.equal(await page.locator("#pair").inputValue(),"prism-fork");
    await page.locator("#notesA").fill("Synthetic A note; not human playtesting.");
    assert.match(await page.locator("#preview").inputValue(),/> Synthetic A note; not human playtesting/);
    page.once("dialog",async dialog=>{
      assert.match(dialog.message(),/clear notes about experiences A and B/);
      await dialog.dismiss();
    });
    await page.locator("#order").selectOption("variant-first");
    assert.equal(await page.locator("#order").inputValue(),"original-first");
    assert.match(await page.locator("#preview").inputValue(),/Original: Prism Relay/);
    assert.equal(await page.locator("#notesA").inputValue(),"Synthetic A note; not human playtesting.");
    page.once("dialog",async dialog=>{await dialog.accept();});
    await page.locator("#order").selectOption("variant-first");
    assert.equal(await page.locator("#notesA").inputValue(),"",
      "Changing A/B identity must not silently transfer earlier observations");
    assert.match(await page.locator("#preview").inputValue(),/\*\*Experience A:\*\* Variant lab: Forked Spectrum/);
    await page.locator("#notesA").fill("New synthetic notes for Forked Spectrum.");
    assert.equal(await page.locator("#notesB").inputValue(),"");
    assert.equal(await page.locator("#played").inputValue(),"not-recorded",
      "context changes must clear prior played-confirmation");
    assert.equal(await page.locator("#after-both").isHidden(),true);
    await page.locator("#played").selectOption("original-only");
    assert.match(await page.locator("#preview").inputValue(),/Incomplete; not a head-to-head comparison/);
    await page.locator("#played").selectOption("both");
    assert.equal(await page.locator("#after-both").isHidden(),false);
    await page.locator("#after-both summary").click();
    assert.notEqual(await page.locator("#after-both").getAttribute("open"),null);
    await page.locator("#friction").fill("The lab was more confusing (synthetic).");
    const expected=await page.locator("#preview").inputValue();
    assert.match(expected,/more confusing/);
    await page.locator("#played").selectOption("variant-only");
    assert.doesNotMatch(await page.locator("#preview").inputValue(),/more confusing/);
    assert.match(await page.locator("#preview").inputValue(),/Incomplete; not a head-to-head comparison/);
    await page.locator("#played").selectOption("both");
    assert.match(await page.locator("#preview").inputValue(),/more confusing/);

    const [download]=await Promise.all([
      page.waitForEvent("download"),
      page.locator("#download").click()
    ]);
    assert.equal(download.suggestedFilename(),"game-company-comparison-prism-fork.md");
    assert.match(await page.locator("#status").textContent(),/Nothing was submitted/);

    // A manual Markdown edit was previously lost with no prompt on a
    // pair/order change if all named form fields were blank. It could also
    // disappear when an unrelated input caused automatic regeneration.
    await page.locator("#preview").fill("# Synthetic hand-edited report for Prism");
    page.once("dialog", async dialog=>{
      assert.match(dialog.message(),/manually edited Markdown report/);
      await dialog.dismiss();
    });
    await page.locator("#pair").selectOption("pulse-voices");
    assert.equal(await page.locator("#pair").inputValue(),"prism-fork");
    assert.equal(await page.locator("#preview").inputValue(),
      "# Synthetic hand-edited report for Prism",
      "Rejecting a pair change preserves direct Markdown edits and original attribution");
    assert.match(await page.locator("#status").textContent(),/Switch cancelled/);

    // Accepting the context switch deliberately discards the old report
    // while removing observations and played-both claims from the new pair.
    page.once("dialog",async dialog=>{await dialog.accept();});
    await page.locator("#pair").selectOption("pulse-voices");
    assert.equal(await page.locator("#pair").inputValue(),"pulse-voices");
    assert.match(await page.locator("#preview").inputValue(),/Pulse Garden and Plant Voices/);
    assert.doesNotMatch(await page.locator("#preview").inputValue(),/Synthetic hand-edited report/);
    assert.equal(await page.locator("#played").inputValue(),"not-recorded");
    assert.equal(await page.locator("#notesA").inputValue(),"");

    // Manual edits are equally protected against otherwise noncontext
    // changes; declining restores the previous input and old report.
    await page.locator("#preview").fill("# Carefully revised local report");
    page.once("dialog",async dialog=>{
      assert.match(dialog.message(),/Changing form answers will replace/);
      await dialog.dismiss();
    });
    await page.locator("#environment").fill("Synthetic tablet notes");
    assert.equal(await page.locator("#environment").inputValue(),"");
    assert.equal(await page.locator("#preview").inputValue(),
      "# Carefully revised local report");
    assert.match(await page.locator("#status").textContent(),/Change cancelled/);
    // A blur/change following a rejected input must not ask again or erase.
    await page.locator("#pair").focus();
    assert.equal(await page.locator("#preview").inputValue(),
      "# Carefully revised local report");

    page.once("dialog",async dialog=>{await dialog.accept();});
    await page.locator("#environment").fill("Synthetic tablet notes");
    assert.equal(await page.locator("#environment").inputValue(),"Synthetic tablet notes");
    assert.match(await page.locator("#preview").inputValue(),/> Synthetic tablet notes/);
    assert.doesNotMatch(await page.locator("#preview").inputValue(),/Carefully revised local report/);
    // All these operations remain local; the shared request assertions below
    // still reject even a single non-GET/off-origin request.

    await page.goto(url+"?pair=javascript:alert(1)");
    assert.equal(await page.locator("#pair").inputValue(),"");
    assert.equal(await page.locator("#link-a").getAttribute("href"),null);
    assert.match(await page.locator("#preview").inputValue(),/Unspecified comparison/);
    assert.equal(await page.locator("#notesA").inputValue(),"");
    await page.goto(url);
    assert.equal(await page.locator("#pair").inputValue(),"");
    for(const width of [360,320]){
      await page.setViewportSize({width,height:740});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const overflow=await page.evaluate(()=>
        document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=1,width+"px comparison worksheet overflow: "+overflow);
      assert.ok(await page.locator("#pair").isVisible());
      assert.ok(await page.locator("#copy").isVisible());
    }
    assert.deepEqual(errors,[],"no console or JS errors");
    assert.deepEqual(outbound,[],"no outbound/post requests");
    assert.equal(await page.evaluate(()=>localStorage.length),0,"no saved answers");
    await context.close();
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
