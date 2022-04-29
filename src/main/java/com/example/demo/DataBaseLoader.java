package com.example.demo;


import com.example.demo.BookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DataBaseLoader implements CommandLineRunner {

       /* private final BookRepository repository;

        @Autowired
        public DataBaseLoader(BookRepository repository) {
            this.repository = repository;
        }

        @Override
        public void run(String... strings) throws Exception {
                this.repository.save(new Book("Как создать уютный интерьер с помощью растений", "Авторы заглянули в сотни домов по всему миру, оценили необычные идеи оформления интерьера при помощи растений, обменялись советами по уходу за ними и собрали все это в одной вдохновляющей книге"));
        }*/

    private final BookRepository repository;
       @Autowired
       public DataBaseLoader(BookRepository repository) {
           this.repository = repository;
       }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public static void main(String[] args) {
        SpringApplication.run(DataBaseLoader.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        String sql =
                "INSERT INTO book (title, description)\n" +
                        "VALUES('Как создать уютный интерьер с помощью растений', 'Авторы заглянули в сотни домов по всему миру, оценили необычные идеи оформления интерьера при помощи растений, обменялись советами по уходу за ними и собрали все это в одной вдохновляющей книге');";

        int rows = jdbcTemplate.update(sql);
        if (rows > 0) {
            System.out.println("Запись добавлена");
        }
    }

}