package com.example.demo;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;


@Controller  //	 MVC контроллер.
public class HomeController {

    @RequestMapping(value = "/")  //
    public String index() {
        return "index";
    }



}
